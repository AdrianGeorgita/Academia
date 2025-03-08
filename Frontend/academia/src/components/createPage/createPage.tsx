import React, {useEffect, useState} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavBar from '../navBar/navBar';
import './createPage.css';
import { useStats } from "../context/statsContext";

const HOST_URL = "http://localhost:8000";

interface Teacher {
    id: number;
    prenume: string;
    nume: string;
    email: string;
}

const CreatePage = () => {
    const [entityType, setEntityType] = useState<'student' | 'teacher' | 'lecture'>('student');
    const [formData, setFormData] = useState<any>({});
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const { stats } = useStats();

    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [allTeachers, setTeachers] = useState<Teacher[]>([]);

    const location = useLocation();

    useEffect(() => {
        const fetchTeachers = async () => {

            const token = localStorage.getItem('authToken');
            if (!token) navigate('/login');

            const api = stats?._links.view_teachers;
            if (!api) navigate('/dashboard');

            setEntityType(location.state?.category || 'student');

            const teachers_response = await fetch(`${HOST_URL}${stats?._links.view_teachers.href}?items_per_page=1000`, {
                method: stats?._links.view_teachers.method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!teachers_response.ok) {
                const errorBody = await teachers_response.json();
                throw new Error(errorBody.detail || teachers_response.statusText);
            }

            const teachers_data = await teachers_response.json();
            setTeachers(teachers_data.teachers);
        }
        fetchTeachers();
    }, [navigate, stats, location.state?.category]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedValue = e.target.value;
        setSelectedTeacher(selectedValue);

        const selectedTeacherObj = allTeachers.find(
            (teacher) => `${teacher.prenume} ${teacher.nume} - ${teacher.email}` === selectedValue
        );

        setFormData((prev: any) => ({
            ...prev,
            coordinator_id: selectedTeacherObj ? selectedTeacherObj.id : '',
        }));
    };

    const handleSubmit = async () => {
        try {

            const token = localStorage.getItem('authToken');
            if (!token) navigate('/login');

            const api = stats?._links[`add_${entityType}`];

            if(!api) navigate('/dashboard');

            const year = formData["year"] || 1
            const code_regex = new RegExp(`^TI\\.D[SDOL]\\.${year}\\d{2}$`);

            if(entityType === "lecture" && !code_regex.test(formData["code"])) {
                alert("Invalid Code Format!")
                return;
            }


            const response = await fetch(`${HOST_URL}${api?.href}`, {
                method: api?.method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            alert(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully!`);
            navigate('/dashboard');
        } catch (error) {
            if (error instanceof Error) setError(error.message);
        }
    };

    return (
        <div>
            <NavBar />
            <div className="create-entity-container">
                <h1 className="profile-title">Create {entityType.charAt(0).toUpperCase() + entityType.slice(1)}</h1>

                <div className="profile-details">
                    {/*<label className="profile-label">*/}
                    {/*    <strong>Entity Type:</strong>*/}
                    {/*    <select value={entityType} onChange={(e) => setEntityType(e.target.value as any)} className="editable-input">*/}
                    {/*        <option value="student">Student</option>*/}
                    {/*        <option value="teacher">Teacher</option>*/}
                    {/*        <option value="lecture">Lecture</option>*/}
                    {/*    </select>*/}
                    {/*</label>*/}

                    {entityType === 'student' && (
                        <>
                            <label className="profile-label">
                                <strong>First Name:</strong>
                                <input type="text" name="first_name" placeholder="First Name" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Last Name:</strong>
                                <input type="text" name="last_name" placeholder="Last Name" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Email:</strong>
                                <input type="email" name="email" placeholder="Email" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Study Cycle:</strong>
                                <select
                                    name="study_cycle"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Study Cycle</option>
                                    <option value="licenta">Licenta</option>
                                    <option value="master">Master</option>
                                </select>
                            </label>
                            <label className="profile-label">
                                <strong>Year of Study:</strong>
                                <input type="number" name="study_year" min={1} max={4} placeholder="Year of Study"
                                       onChange={handleChange} className="editable-input"/>
                            </label>
                            <label className="profile-label">
                                <strong>Group:</strong>
                                <input type="number" name="group" placeholder="Group" onChange={handleChange} className="editable-input" />
                            </label>
                        </>
                    )}

                    {entityType === 'teacher' && (
                        <>
                            <label className="profile-label">
                                <strong>First Name:</strong>
                                <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Last Name:</strong>
                                <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Email:</strong>
                                <input type="email" name="email" placeholder="Email" onChange={handleChange} className="editable-input" />
                            </label>
                            <label className="profile-label">
                                <strong>Teaching Degree:</strong>
                                <select
                                    name="teachingDegree"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Degree</option>
                                    <option value="prof">Profesor</option>
                                    <option value="conf">Conferentiar</option>
                                    <option value="sef_lucr">Sef Lucrari</option>
                                    <option value="asist">Asistent</option>
                                </select>
                            </label>
                            <label className="profile-label">
                                <strong>Association Type:</strong>
                                <select
                                    name="associationType"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Association Type</option>
                                    <option value="titular">Titular</option>
                                    <option value="asociat">Asociat</option>
                                    <option value="extern">Extern</option>
                                </select>
                            </label>
                            <label className="profile-label">
                                <strong>Affiliation:</strong>
                                <input type="text" name="affiliation" placeholder="Affiliation" onChange={handleChange}
                                       className="editable-input"/>
                            </label>

                        </>
                    )}

                    {entityType === 'lecture' && (
                        <>
                            <label className="profile-label">
                                <strong>Code:</strong>
                                <input type="text" name="code" placeholder="Code" onChange={handleChange}
                                       className="editable-input"/>
                            </label>
                            <label className="profile-label">
                                <strong>Lecture Name:</strong>
                                <input type="text" name="lecture_name" placeholder="Lecture Name"
                                       onChange={handleChange} className="editable-input"/>
                            </label>
                            <label className="profile-label">
                                <strong>Coordinator:</strong>
                                <input
                                    name="coordinator_id"
                                    id="coordinator_id"
                                    list="coordinators-list"
                                    className="editable-input"
                                    value={selectedTeacher}
                                    onChange={handleTeacherChange}
                                    placeholder="Select a Coordinator"
                                />
                                <datalist id="coordinators-list">
                                    {allTeachers.map((teacher) => (
                                        <option key={teacher.id}
                                                value={`${teacher.prenume} ${teacher.nume} - ${teacher.email}`}/>
                                    ))}
                                </datalist>
                            </label>
                            <label className="profile-label">
                                <strong>Year:</strong>
                                <input type="number" name="year" min={1} max={4} placeholder="Year" onChange={handleChange}
                                       className="editable-input"/>
                            </label>
                            <label className="profile-label">
                                <strong>Lecture Type:</strong>
                                <select
                                    name="lecture_type"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Lecture Type</option>
                                    <option value="impusa">Impusa</option>
                                    <option value="optionala">Optionala</option>
                                    <option value="liber_aleasa">Liber Aleasa</option>
                                </select>
                            </label>
                            <label className="profile-label">
                                <strong>Category:</strong>
                                <select
                                    name="category"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Category</option>
                                    <option value="domeniu">Domeniu</option>
                                    <option value="specialitate">Specialitate</option>
                                    <option value="adiacenta">Adiacenta</option>
                                </select>
                            </label>
                            <label className="profile-label">
                                <strong>Examination:</strong>
                                <select
                                    name="examination"
                                    onChange={handleChange}
                                    className="editable-input"
                                >
                                    <option value="">Select Examination Type</option>
                                    <option value="examen">Examen</option>
                                    <option value="colocviu">Colocviu</option>
                                </select>
                            </label>
                        </>
                    )}
                </div>

                <div className="button-group">
                    <button className="back-button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                    <button className="update-button" onClick={handleSubmit}>Create {entityType}</button>
                </div>

                {error && <p className="error">Error: {error}</p>}
            </div>
        </div>
    );
};

export default CreatePage;
