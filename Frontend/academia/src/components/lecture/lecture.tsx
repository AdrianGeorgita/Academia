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

                if(data.materials?.materials == null)
                    setNoData(true);
                else
                    setNoData(false);

                console.log(data);

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

                if (!apiUrl) {
                    setFileUploadError('No API link available');
                    return;
                }

                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${materialsHost}${apiUrl}`, {
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
                    <p><strong>Subject Type:</strong> {lectureDetails.lecture.tip_disciplina}</p>
                    <p><strong>Category:</strong> {lectureDetails.lecture.categorie_disciplina}</p>
                    <p><strong>Examination Type:</strong> {lectureDetails.lecture.tip_examinare}</p>
                </div>

                <div className="section-container">
                    <h3>Evaluation</h3>
                    <ul className="evaluation-list">
                        <li>
                            <strong>Final Examination:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <input type="number" value={finalExam} onChange={handleFinalExamChange} step="0.1"/>
                            ) : (
                                <span> {finalExam}</span>
                            )}
                        </li>
                        <li>
                            <strong>Laboratory Activity:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <input type="number" value={labActivity} onChange={handleLabActivityChange} step="0.1"/>
                            ) : (
                                <span> {labActivity}</span>
                            )}
                        </li>
                        <li>
                            <strong>Project:</strong>
                            {lectureDetails?.materials?._links?.update ? (
                                <input type="number" value={project} onChange={handleProjectChange} step="0.1"/>
                            ) : (
                                <span> {project}</span>
                            )}
                        </li>
                    </ul>
                    {lectureDetails?.materials?._links?.update && (
                        <button className="update-button" onClick={() => handleUpload('evaluation')}>Update</button>
                    )}
                </div>

                <div className="section-container">
                    <h3>Course Materials</h3>
                    <ul className="materials-list">
                        {materials["materiale-curs"] && materials["materiale-curs"].length > 0 ? (
                            materials["materiale-curs"].map((material, index) => (
                                <li key={index}>
                                    <p><strong>File Name:</strong></p>
                                    <button className="download-btn"
                                            onClick={() => handleDownloadPDF(material.content, material["nume-fisier"])}>{material["nume-fisier"]}</button>
                                    {lectureDetails?.materials?._links?.update && (
                                        <button className="delete-btn"
                                                onClick={() => handleDeleteMaterial('course', material["nume-fisier"])}>Delete</button>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li>No course materials available.</li>
                        )}
                    </ul>
                    {lectureDetails?.materials?._links?.update && (
                        <>
                            <input type="file" onChange={handleCourseFileChange}/>
                            <button className="upload-btn" onClick={() => handleUpload('course')}>Upload Course
                                Material
                            </button>
                        </>
                    )}
                </div>

                <div className="section-container">
                    <h3>Laboratory Materials</h3>
                    <ul className="materials-list">
                        {materials["materiale-laborator"] && materials["materiale-laborator"].length > 0 ? (
                            materials["materiale-laborator"].map((material, index) => (
                                <li key={index}>
                                    <p><strong>File Name:</strong></p>
                                    <button className="download-btn"
                                            onClick={() => handleDownloadPDF(material.content, material["nume-fisier"])}>{material["nume-fisier"]}</button>
                                    {lectureDetails?.materials?._links?.update && (
                                        <button className="delete-btn"
                                                onClick={() => handleDeleteMaterial('lab', material["nume-fisier"])}>Delete</button>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li>No laboratory materials available.</li>
                        )}
                    </ul>
                    {lectureDetails?.materials?._links?.update && (
                        <>
                            <input type="file" onChange={handleLabFileChange}/>
                            <button className="upload-btn" onClick={() => handleUpload('lab')}>Upload Lab Material
                            </button>
                        </>
                    )}
                </div>

                {fileUploadError && <div className="error">{fileUploadError}</div>}
            </div>
        </div>
    );

};

export default LecturePage;
