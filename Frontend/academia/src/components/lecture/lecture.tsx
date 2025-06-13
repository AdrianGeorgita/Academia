import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import './lecture.css';
import NavBar from "../navBar/navBar";

interface Material {
    "nume-fisier": string;
    content: string;
}

interface MaterialsStructure {
    "probe-evaluare"?: {
        "activitate-laborator": number;
        "examinare-finala": number;
        proiect: number;
    };
    "materiale-curs"?: Material[] | null;
    "materiale-laborator"?: Material[] | null;
}

interface LectureDetails {
    lecture: {
        cod: string;
        nume_disciplina: string;
        an_studiu: number;
        tip_disciplina: string;
        categorie_disciplina: string;
        tip_examinare: string;
    };
    materials: {
        materials: MaterialsStructure | null;
        _links?: {
            self: { href: string; method: string };
            parent: { href: string; method: string };
            update?: { href: string; method: string };
            create?: { href: string; method: string };
            delete?: { href: string; method: string };
        };
    } | null;
    _links: {
        self: { href: string; method: string };
        parent: { href: string; method: string };
        update?: { href: string; method: string };
    } | undefined;
}

const LecturePage: React.FC = () => {
    const { cod } = useParams<{ cod: string }>();
    const [lectureDetails, setLectureDetails] = useState<LectureDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [selectedCourseFile, setSelectedCourseFile] = useState<File | null>(null);
    const [selectedLabFile, setSelectedLabFile] = useState<File | null>(null);
    const [fileUploadError, setFileUploadError] = useState<string>('');
    const [noData, setNoData] = useState<boolean>(true);
    const [studentsAPI, setStudentsAPI] = useState<string>('');

    const [finalExam, setFinalExam] = useState<number>(0.5);
    const [labActivity, setLabActivity] = useState<number>(0.5);
    const [project, setProject] = useState<number>(0.0);

    const location = useLocation();
    const { path } = location.state || {};
    const host = 'http://localhost:8000';
    const materialsHost = "http://localhost:8004";
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLectureDetails = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) navigate('/login');

                if (!path) {
                    throw new Error('Invalid path');
                }

                const response = await fetch(`${host}${path}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(errorBody.detail || response.statusText);
                }

                const data = await response.json();

                console.log(data);

                setLectureDetails(data);

                if(data.materials?.materials)
                    setNoData(false);
                else
                    setNoData(true);

                if(data._links.students) {
                    setStudentsAPI(data._links.students)
                    localStorage.setItem("enrolledStudents", data._links.students.href);
                }

                if (data.materials?.materials?.["probe-evaluare"]) {
                    setFinalExam(data.materials.materials["probe-evaluare"]["examinare-finala"]);
                    setLabActivity(data.materials.materials["probe-evaluare"]["activitate-laborator"]);
                    setProject(data.materials.materials["probe-evaluare"].proiect);
                }

            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLectureDetails();
    }, [path, cod, navigate]);
    const handleCourseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedCourseFile(e.target.files[0]);
        }
    };

    const handleLabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedLabFile(e.target.files[0]);
        }
    };

    const handleFinalExamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFinalExam(parseFloat(e.target.value) || 0);
    };

    const handleLabActivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLabActivity(parseFloat(e.target.value) || 0);
    };

    const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProject(parseFloat(e.target.value) || 0);
    };

    const handleUpload = async (type: string) => {

        if(type !== "evaluation") {
            const selectedFile = type === 'course' ? selectedCourseFile : selectedLabFile;
            if (!selectedFile) {
                setFileUploadError('No file selected');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const fileContent = reader.result as string;
                const material: Material = {
                    "nume-fisier": selectedFile.name,
                    "content": fileContent.split(',')[1],
                };

                const updatedMaterials: MaterialsStructure = lectureDetails?.materials?.materials || {
                    "materiale-curs": [],
                    "materiale-laborator": [],
                    "probe-evaluare": {
                        "activitate-laborator": labActivity,
                        "examinare-finala": finalExam,
                        proiect: project,
                    }
                };

                if (type === 'course') {
                    updatedMaterials["materiale-curs"] = [...(updatedMaterials["materiale-curs"] || []), material];
                } else {
                    updatedMaterials["materiale-laborator"] = [...(updatedMaterials["materiale-laborator"] || []), material];
                }

                const payload = {
                    "probe-evaluare": updatedMaterials["probe-evaluare"],
                    "materiale-curs": updatedMaterials["materiale-curs"],
                    "materiale-laborator": updatedMaterials["materiale-laborator"]
                };


                const apiUrl = noData
                    ? lectureDetails?.materials?._links?.create?.href
                    : lectureDetails?.materials?._links?.update?.href;

                const method = noData
                    ? lectureDetails?.materials?._links?.create?.method
                    : lectureDetails?.materials?._links?.update?.method;


                if (!apiUrl || !method) {
                    setFileUploadError('No API link available');
                    return;
                }

                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${materialsHost}${apiUrl}`, {
                        method: method,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });

                    if (!response.ok) {
                        const errorBody = await response.json();
                        throw new Error(errorBody.detail || response.statusText);
                    }

                    alert('File uploaded successfully');
                    setLectureDetails({ ...lectureDetails!, materials: { ...lectureDetails!.materials, materials: updatedMaterials } });
                    if (type === 'course') setSelectedCourseFile(null);
                    else setSelectedLabFile(null);
                    setFileUploadError('');
                } catch (error) {
                    if (error instanceof Error) {
                        alert(error.message);
                        setFileUploadError(error.message);
                    }
                }
            };
            reader.readAsDataURL(selectedFile);
        }
        else
        {
            const updatedMaterials: MaterialsStructure = {
                "materiale-curs": lectureDetails?.materials?.materials?.["materiale-curs"] || [],
                "materiale-laborator": lectureDetails?.materials?.materials?.["materiale-laborator"] || [],
                "probe-evaluare": {
                    "activitate-laborator": labActivity,
                    "examinare-finala": finalExam,
                    proiect: project,
                }
            };

            const payload = {
                "probe-evaluare": updatedMaterials["probe-evaluare"],
                "materiale-curs": updatedMaterials["materiale-curs"],
                "materiale-laborator": updatedMaterials["materiale-laborator"]
            };

            const apiUrl  = noData
                ? lectureDetails?.materials?._links?.create?.href
                : lectureDetails?.materials?._links?.update?.href;

            const apiMethod = noData
                ? lectureDetails?.materials?._links?.create?.method
                : lectureDetails?.materials?._links?.update?.method;

            console.log(noData);

            if (!apiUrl) {
                setFileUploadError('No API link available');
                return;
            }

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${materialsHost}${apiUrl}`, {
                    method: `${apiMethod}`,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(errorBody.detail || response.statusText);
                }

                if(noData)
                    setNoData(false);

                alert('File uploaded successfully');
                setLectureDetails({ ...lectureDetails!, materials: { ...lectureDetails!.materials, materials: updatedMaterials } });
                setFileUploadError('');
            } catch (error) {
                if (error instanceof Error) {
                    alert(error.message);
                    setFileUploadError(error.message);
                }
            }
        }

    };

    const handleDeleteMaterial = async (type: string, fileName: string) => {
        const updatedMaterials: MaterialsStructure = lectureDetails?.materials?.materials || {
            "materiale-curs": [],
            "materiale-laborator": [],
            "probe-evaluare": {
                "activitate-laborator": 0.5,
                "examinare-finala": 0.5,
                proiect: 0.0,
            }
        };

        if (type === 'course') {
            updatedMaterials["materiale-curs"] = (updatedMaterials["materiale-curs"] || []).filter(material => material["nume-fisier"] !== fileName);
        } else {
            updatedMaterials["materiale-laborator"] = (updatedMaterials["materiale-laborator"] || []).filter(material => material["nume-fisier"] !== fileName);
        }

        const payload = {
            "probe-evaluare": updatedMaterials["probe-evaluare"],
            "materiale-curs": updatedMaterials["materiale-curs"],
            "materiale-laborator": updatedMaterials["materiale-laborator"]
        };

        const updateUrl = lectureDetails?.materials?._links?.update?.href;

        if (!updateUrl) {
            setError('No update link available');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${materialsHost}${updateUrl}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            alert('Material deleted successfully');
            setLectureDetails({ ...lectureDetails, materials: { ...lectureDetails!.materials, materials: updatedMaterials } });
        } catch (error) {
            if (error instanceof Error) {
                alert(error.message);
                setError(error.message);
            }
        }
    };

    const handleDownloadPDF = (content: string, fileName: string) => {
        const byteCharacters = atob(content);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
            const slice = byteCharacters.slice(offset, offset + 1024);
            const byteNumbers = Array.from(slice, char => char.charCodeAt(0));
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const pdfBlob = new Blob(byteArrays, { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const capitalizeFirstLetter = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    if (!lectureDetails) {
        return <div className="error">No lecture details found!</div>;
    }

    const materials = lectureDetails.materials?.materials || {
        "materiale-curs": [],
        "materiale-laborator": [],
        "probe-evaluare": {
            "activitate-laborator": labActivity,
            "examinare-finala": finalExam,
            proiect: project,
        }
    };

    return (
        <div>
            <NavBar />
            <div className="lecture-page-container">
                <div className="button-group">
                    <button className="back-button" onClick={() => navigate('/lectures')}>Back to Main</button>
                    {studentsAPI && (
                        <button className="enrolled-students-button"
                                onClick={() => navigate(`/lectures/${cod}/students`)}>Enrolled Students</button>
                    )}
                </div>

                <div className="section-container lecture-details">
                    <h1>{lectureDetails.lecture.nume_disciplina}</h1>
                    <p><strong>Code:</strong> {lectureDetails.lecture.cod}</p>
                    <p><strong>Year of Study:</strong> {lectureDetails.lecture.an_studiu}</p>
                    <p><strong>Subject Type:</strong> {capitalizeFirstLetter(lectureDetails.lecture.tip_disciplina)}</p>
                    <p><strong>Category:</strong> {capitalizeFirstLetter(lectureDetails.lecture.categorie_disciplina)}</p>
                    <p><strong>Examination Type:</strong> {capitalizeFirstLetter(lectureDetails.lecture.tip_examinare)}</p>
                </div>

                <div className="section-container">
                    <h3>Evaluation</h3>
                    {lectureDetails?.materials?._links?.update && (
                        <div className="evaluation-note">
                            Note: The evaluation weights must add up to 100%
                        </div>
                    )}
                    <ul className="evaluation-list">
                        <li>
                            <strong>Final Examination:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <div className="evaluation-input-group">
                                    <input type="number" value={finalExam} onChange={handleFinalExamChange} step="0.1"/>
                                    <span className="percentage">({(finalExam * 100).toFixed(0)}%)</span>
                                </div>
                            ) : (
                                <span> {(finalExam * 100).toFixed(0)}%</span>
                            )}
                        </li>
                        <li>
                            <strong>Laboratory Activity:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <div className="evaluation-input-group">
                                    <input type="number" value={labActivity} onChange={handleLabActivityChange} step="0.1"/>
                                    <span className="percentage">({(labActivity * 100).toFixed(0)}%)</span>
                                </div>
                            ) : (
                                <span> {(labActivity * 100).toFixed(0)}%</span>
                            )}
                        </li>
                        <li>
                            <strong>Project:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <div className="evaluation-input-group">
                                    <input type="number" value={project} onChange={handleProjectChange} step="0.1"/>
                                    <span className="percentage">({(project * 100).toFixed(0)}%)</span>
                                </div>
                            ) : (
                                <span> {(project * 100).toFixed(0)}%</span>
                            )}
                        </li>
                        {lectureDetails?.materials?._links?.update && (
                            <li className="total-evaluation">
                                <strong>Total:</strong>
                                <span className="total-percentage">({((finalExam + labActivity + project) * 100).toFixed(0)}%)</span>
                            </li>
                        )}
                    </ul>
                    {lectureDetails?.materials?._links?.update && (
                        <button className="update-button" onClick={() => handleUpload('evaluation')}>Update</button>
                    )}
                </div>

                <div className="section-container">
                    <h3>Course Materials</h3>
                    <div className="materials-container">
                        <ul className="materials-list">
                            {materials["materiale-curs"] && materials["materiale-curs"].length > 0 ? (
                                materials["materiale-curs"].map((material, index) => (
                                    <li key={index} className="material-item">
                                        <div className="material-info">
                                            <svg className="file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                            <span className="file-name">{material["nume-fisier"]}</span>
                                        </div>
                                        <div className="material-actions">
                                            <button className="download-btn"
                                                    onClick={() => handleDownloadPDF(material.content, material["nume-fisier"])}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                                Download
                                            </button>
                                            {lectureDetails?.materials?._links?.update && (
                                                <button className="delete-btn"
                                                        onClick={() => handleDeleteMaterial('course', material["nume-fisier"])}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="no-materials">No course materials available.</li>
                            )}
                        </ul>
                        {lectureDetails?.materials?._links?.update && (
                            <div className="upload-section">
                                <div className="file-input-container">
                                    <input type="file" 
                                           id="course-file" 
                                           onChange={handleCourseFileChange}
                                           className="file-input" />
                                    <label htmlFor="course-file" className="file-input-label">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        Choose File
                                    </label>
                                    <span className="selected-file">{selectedCourseFile ? selectedCourseFile.name : 'No file chosen'}</span>
                                </div>
                                <button className="upload-btn" onClick={() => handleUpload('course')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Upload Material
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="section-container">
                    <h3>Laboratory Materials</h3>
                    <div className="materials-container">
                        <ul className="materials-list">
                            {materials["materiale-laborator"] && materials["materiale-laborator"].length > 0 ? (
                                materials["materiale-laborator"].map((material, index) => (
                                    <li key={index} className="material-item">
                                        <div className="material-info">
                                            <svg className="file-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                            <span className="file-name">{material["nume-fisier"]}</span>
                                        </div>
                                        <div className="material-actions">
                                            <button className="download-btn"
                                                    onClick={() => handleDownloadPDF(material.content, material["nume-fisier"])}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                                Download
                                            </button>
                                            {lectureDetails?.materials?._links?.update && (
                                                <button className="delete-btn"
                                                        onClick={() => handleDeleteMaterial('lab', material["nume-fisier"])}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="no-materials">No laboratory materials available.</li>
                            )}
                        </ul>
                        {lectureDetails?.materials?._links?.update && (
                            <div className="upload-section">
                                <div className="file-input-container">
                                    <input type="file" 
                                           id="lab-file" 
                                           onChange={handleLabFileChange}
                                           className="file-input" />
                                    <label htmlFor="lab-file" className="file-input-label">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        Choose File
                                    </label>
                                    <span className="selected-file">{selectedLabFile ? selectedLabFile.name : 'No file chosen'}</span>
                                </div>
                                <button className="upload-btn" onClick={() => handleUpload('lab')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Upload Material
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {fileUploadError && <div className="error">{fileUploadError}</div>}
            </div>
        </div>
    );

};

export default LecturePage;
