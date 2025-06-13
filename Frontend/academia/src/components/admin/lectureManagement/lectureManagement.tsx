import React, { useEffect, useState } from 'react';
import {useParams, useNavigate, useLocation} from 'react-router-dom';
import './lectureManagament.css';
import NavBar from "../../navBar/navBar";
import {useStats} from "../../context/statsContext";

interface Links {
    self: { href: string; method: string };
    update: { href: string; method: string };
    delete: { href: string; method: string };
}

interface Lecture {
    cod: string;
    id_titular: number;
    nume_disciplina: string;
    an_studiu: number;
    tip_disciplina: string;
    categorie_disciplina: string;
    tip_examinare: string;
    _links: Links;
}

interface Teacher {
    id: number;
    prenume: string;
    nume: string;
    email: string;
}

const LectureManagementPage: React.FC = () => {
    const { cod } = useParams<{ cod: string }>();
    const [lecture, setLecture] = useState<Lecture | null>(null);
    const [lectureLinks, setLectureLinks] = useState<Links>({
        self: {href: "", method: "GET"},
        update: {href: "", method: "GET"},
        delete: {href: "", method: "GET"},
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const location = useLocation();
    const { stats } = useStats();

    const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
    const [allTeachers, setTeachers] = useState<Teacher[]>([]);

    const HOST_URL = 'http://localhost:8000';

    const { apiUrl } = location.state || {};

    const fetchTeachers = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) navigate('/login');

        const api = stats?._links.view_teachers;
        if (!api) {navigate('/dashboard'); return;}

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
    };

    useEffect(() => {
        const fetchLectureDetails = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) navigate('/login');

                if (!apiUrl) return;

                const response = await fetch(`${HOST_URL}${apiUrl}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch lecture details');
                }

                const data = await response.json();
                setLecture(data.lecture);
                setLectureLinks(data._links);

                if (data.lecture.id_titular) {
                    setSelectedTeacher(data.lecture.id_titular);
                }
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTeachers();
        fetchLectureDetails();
    }, [stats, cod, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setLecture(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };

    const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedTeacherId = e.target.value;

        const selectedTeacherObj = allTeachers.find(
            (teacher) => `${teacher.prenume} ${teacher.nume} - ${teacher.email}` === selectedTeacherId
        );
        setSelectedTeacher(selectedTeacherObj ? selectedTeacherObj.id : null);

        setLecture((prev: any) => ({
            ...prev,
            id_titular: selectedTeacherObj ? selectedTeacherObj.id : ''
        }));
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) navigate('/login');

            const body = {
                "coordinator_id": lecture?.id_titular,
                "lecture_name": lecture?.nume_disciplina,
                "year": lecture?.an_studiu,
                "lecture_type": lecture?.tip_disciplina,
                "category": lecture?.categorie_disciplina,
                "examination": lecture?.tip_examinare,
            };

            const response = await fetch(`${HOST_URL}${lectureLinks.update.href}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || 'Failed to update lecture details');
            }

            setError("Successfully updated lecture details");
            //navigate('/dashboard');
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!lecture) return <div>No lecture details found!</div>;

    return (
        <div>
            <NavBar />
            <div className="lecture-management-container">
                <h1 className="profile-title">Edit Lecture</h1>
                <div className="lecture-management-details">
                    <label className="lecture-management-label">
                        <strong>Code:</strong>
                        <input type="text" name="cod" value={lecture.cod}
                               onChange={handleChange} className="editable-input"/>
                    </label>
                    <label className="lecture-management-label">
                        <strong>Lecture Name:</strong>
                        <input type="text" name="nume_disciplina" value={lecture.nume_disciplina}
                               onChange={handleChange} className="editable-input"/>
                    </label>
                    <label className="profile-label">
                        <strong>Coordinator:</strong>
                        <input
                            name="coordinator_id"
                            list="coordinators-list"
                            className="editable-input"
                            value={selectedTeacher ? `${allTeachers.find(t => t.id === selectedTeacher)?.prenume} ${allTeachers.find(t => t.id === selectedTeacher)?.nume}` : ''}
                            onChange={handleTeacherChange}
                            placeholder="Select a Coordinator"
                        />
                        <datalist id="coordinators-list">
                            {allTeachers.map((teacher) => (
                                <option key={teacher.id} value={`${teacher.prenume} ${teacher.nume} - ${teacher.email}`} />
                            ))}
                        </datalist>
                    </label>
                    <label className="lecture-management-label">
                        <strong>Year:</strong>
                        <input type="number" min={1} max={4} name="an_studiu" value={lecture.an_studiu}
                               onChange={handleChange} className="editable-input"/>
                    </label>
                    <label className="profile-label">
                        <strong>Subject Type:</strong>
                        <select
                            name="tip_disciplina"
                            className="editable-input"
                            value={lecture.tip_disciplina}
                            onChange={handleChange}
                        >
                            <option value="domeniu">Domeniu</option>
                            <option value="specialitate">Specialitate</option>
                            <option value="adiacenta">Adiacenta</option>
                        </select>
                    </label>
                    <label className="profile-label">
                        <strong>Subject Category:</strong>
                        <select
                            name="categorie_disciplina"
                            className="editable-input"
                            value={lecture.categorie_disciplina}
                            onChange={handleChange}
                        >
                            <option value="impusa">Impusa</option>
                            <option value="optionala">Optionala</option>
                            <option value="liber_aleasa">Liber Aleasa</option>
                        </select>
                    </label>
                    <label className="profile-label">
                        <strong>Examination Type:</strong>
                        <select
                            name="tip_examinare"
                            className="editable-input"
                            value={lecture.tip_examinare}
                            onChange={handleChange}
                        >
                            <option value="examen">Examen</option>
                            <option value="colocviu">Colocviu</option>
                        </select>
                    </label>

                    <div className="edit-lecture-button-group">
                        <button className="edit-lecture-update-button" onClick={handleSave}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Save Changes
                        </button>
                        <button className="edit-lecture-back-button" onClick={() => navigate('/dashboard/lectures')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
                            Cancel
                        </button>
                    </div>
                    
                </div>
                {error && <p className="lecture-management-error">{error}</p>}
            </div>
        </div>
    );
};

export default LectureManagementPage;
