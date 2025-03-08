import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import "./userManagement.css"
import NavBar from "../navBar/navBar";

interface Links {
    self: { href: string; method: string };
    parent: { href: string; method: string };
    lectures: { href: string; method: string };
    update: { href: string; method: string };
    delete: { href: string; method: string };
}

interface CommonProfile {
    id: number;
    nume: string;
    prenume: string;
    email: string;
    _links: Links;
}

interface Student extends CommonProfile {
    ciclu_studii: string;
    an_studiu: number;
    grupa: number;
}

interface Teacher extends CommonProfile {
    grad_didactic: string;
    tip_asociere: string;
    afiliere: string;
}

interface LectureLinks {
    self: { href: string; method: string };
    parent: { href: string; method: string };
    unassign?: { href: string; method: string };
    assign?: { href: string; method: string };
}

interface Lecture {
    cod: string;
    nume_disciplina: string;
    an_studiu: string;
    _links: LectureLinks;
}

interface UsersListProps {
    category: "students" | "teachers";
}

const UserManagementPage: React.FC<UsersListProps> = ({ category }) => {
    const [profile, setProfile] = useState<Student | Teacher | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const location = useLocation();

    const [studentLectures, setStudentLectures] = useState<Lecture[]>([]);
    const [studentLecturesLinks, setStudentLecturesLinks] = useState<LectureLinks | null>(null);
    const [allLectures, setLectures] = useState<Lecture[]>([]);
    const [selectedStudentLecture, setSelectedStudentLecture] = useState<string>('');
    const [selectedLecture, setSelectedLecture] = useState<string>('');

    const { id} = useParams<{ id: string}>();
    const { apiUrl, lecturesApi } = location.state || {};

    const HOST_URL = "http://localhost:8000";

    useEffect(() => {
        const fetchProfile = async () => {
            if(!apiUrl) return;

            if(!lecturesApi){
                navigate("/dashboard");
            }

            console.log(lecturesApi);

            try {
                const token = localStorage.getItem('authToken');
                if (!token) navigate('/login');

                const response = await fetch(`${HOST_URL}${apiUrl}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(errorBody.detail || response.statusText);
                }

                const data = await response.json();
                setProfile(data.student || data.teacher);

                if(data.student) {
                    const getLecturesApi = data.student["_links"]["lectures"];
                    const lectures_response = await fetch(`${HOST_URL}${getLecturesApi.href}`, {
                        method: getLecturesApi.method,
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!lectures_response.ok && lectures_response.status !== 404) {
                        const errorBody = await lectures_response.json();
                        throw new Error(errorBody.detail || lectures_response.statusText);
                    }

                    if(lectures_response.status !== 404) {
                        const lectures_data = await lectures_response.json();
                        setStudentLectures(lectures_data.lectures.lectures);
                        setStudentLecturesLinks(lectures_data.lectures._links);
                    }


                    const all_lectures_response = await fetch(`${HOST_URL}${lecturesApi.href}?items_per_page=1000`, {
                        method: lecturesApi.method,
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!all_lectures_response.ok) {
                        const errorBody = await all_lectures_response.json();
                        throw new Error(errorBody.detail || all_lectures_response.statusText);
                    }

                    const all_lectures_data = await all_lectures_response.json();
                    const filteredLectures = all_lectures_data.lectures.lectures.filter(
                        (lecture: Lecture) => !studentLectures.some((studentLecture) => studentLecture.cod === lecture.cod)
                    );
                    setLectures(filteredLectures);

                }

            } catch (error) {
                if (error instanceof Error) setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id, category, navigate]);

    const handleDelete = async() => {
        if (!profile) return;

        try {
            const token = localStorage.getItem('authToken');
            const { href, method } = profile._links.delete;

            const response = await fetch(`${HOST_URL}${href}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            alert('Profile deleted successfully');
            navigate(`/dashboard/${category}`);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
                alert('Error deleting profile: ' + error.message);
            }
        }
    }

    const handleUpdate = async () => {
        if (!profile) return;

        try {
            const token = localStorage.getItem('authToken');
            const { href, method } = profile._links.update;

            const body = 'ciclu_studii' in profile ? {
                first_name: profile.prenume,
                last_name: profile.nume,
                email: profile.email,
                study_cycle: profile.ciclu_studii,
                study_year: profile.an_studiu,
                group: profile.grupa,
            } : {
                firstName: profile.prenume,
                lastName: profile.nume,
                email: profile.email,
                teachingDegree: profile.grad_didactic,
                associationType: profile.tip_asociere,
                affiliation: profile.afiliere,
            };

            const response = await fetch(`${HOST_URL}${href}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            alert('Profile updated successfully');
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
                alert('Error updating profile: ' + error.message);
            }
        }
    };

    const assignLecture = async (lecture_code: string) => {
        if (!profile) return;

        try {
            const token = localStorage.getItem('authToken');
            const href = studentLecturesLinks?.assign?.href
            const method = studentLecturesLinks?.assign?.method

            if(!href || !method) return;

            const response = await fetch(`${HOST_URL}${href}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(lecture_code),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            window.location.reload();

        } catch (error) {
            if (error instanceof Error) {
                alert('Error assigning lecture: ' + error.message);
            }
        }
    };

    const unassignLecture = async (lecture_code: string) => {
        if (!profile) return;

        try {
            const token = localStorage.getItem('authToken');
            const studentLecture = studentLectures.find(lecture => lecture.cod === lecture_code);

            if(!studentLecture) return;

            const href = studentLecture._links.unassign?.href
            const method = studentLecture._links.unassign?.method

            if(!href || !method) return;

            const response = await fetch(`${HOST_URL}${href}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.detail || response.statusText);
            }

            window.location.reload();
        } catch (error) {
            if (error instanceof Error) {
                alert('Error unassigning lecture: ' + error.message);
            }
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!profile) return <div className="error">No profile found!</div>;

    return (
        <div>
            <NavBar />
            <div className="profile-page-container">
                <h1 className="profile-title">Admin Profile Management</h1>

                <div className="two-column-layout">
                    {/* Left Column - Profile Information */}
                    <div className="profile-column">
                        <h2>Profile Information</h2>
                        <div className="profile-details">
                            <label className="profile-label">
                                <strong>First Name:</strong>
                                <input
                                    type="text"
                                    value={profile.prenume}
                                    onChange={(e) => setProfile({...profile, prenume: e.target.value})}
                                    className="editable-input"
                                />
                            </label>
                            <label className="profile-label">
                                <strong>Last Name:</strong>
                                <input
                                    type="text"
                                    value={profile.nume}
                                    onChange={(e) => setProfile({...profile, nume: e.target.value})}
                                    className="editable-input"
                                />
                            </label>
                            <p><strong>Email</strong>: {profile.email}</p>

                            {'ciclu_studii' in profile && (
                                <>
                                    <label className="profile-label">
                                        <strong>Study Cycle:</strong>
                                        <select
                                            className="editable-input"
                                            value={profile.ciclu_studii}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                ciclu_studii: e.target.value
                                            })}
                                        >
                                            <option value="licenta">Licenta</option>
                                            <option value="master">Master</option>
                                        </select>
                                    </label>
                                    <label className="profile-label">
                                        <strong>Year of Study:</strong>
                                        <input
                                            type="number"
                                            min={1}
                                            max={4}
                                            value={profile.an_studiu}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                an_studiu: Number(e.target.value)
                                            })}
                                            className="editable-input"
                                        />
                                    </label>
                                    <label className="profile-label">
                                        <strong>Group:</strong>
                                        <input
                                            type="number"
                                            min={1}
                                            max={1999}
                                            value={profile.grupa}
                                            onChange={(e) => setProfile({...profile, grupa: Number(e.target.value)})}
                                            className="editable-input"
                                        />
                                    </label>
                                </>
                            )}

                            {'grad_didactic' in profile && (
                                <>
                                    <label className="profile-label">
                                        <strong>Grade:</strong>
                                        <select
                                            className="editable-input"
                                            value={profile.grad_didactic}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                grad_didactic: e.target.value
                                            })}
                                        >
                                            <option value="prof">Profesor</option>
                                            <option value="conf">Conferentiar</option>
                                            <option value="sef_lucr">Sef Lucrari</option>
                                            <option value="asist">Asistent</option>
                                        </select>
                                    </label>
                                    <label className="profile-label">
                                        <strong>Affiliation:</strong>
                                        <input
                                            type="text"
                                            value={profile.afiliere}
                                            onChange={(e) => setProfile({...profile, afiliere: e.target.value})}
                                            className="editable-input"
                                        />
                                    </label>
                                    <label className="profile-label">
                                        <strong>Association Type:</strong>
                                        <select
                                            className="editable-input"
                                            value={profile.tip_asociere}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                tip_asociere: e.target.value
                                            })}
                                        >
                                            <option value="titular">Titular</option>
                                            <option value="asociat">Asociat</option>
                                            <option value="extern">Extern</option>
                                        </select>
                                    </label>
                                </>
                            )}
                        </div>
                        <div className="button-group">
                            <button className="update-button" onClick={handleUpdate}>Update Profile</button>
                            <button className="delete-button" onClick={handleDelete}>Delete User</button>
                        </div>
                    </div>

                    {'ciclu_studii' in profile && (
                        <div className="lectures-column">
                            <h2>Lecture Management</h2>
                            <div className="lectures-management">
                            <label className="profile-label">
                                    <strong>Student's Lectures:</strong>
                                    <input
                                        name="lectures"
                                        id="lectures"
                                        list="lectures-list"
                                        className="editable-input"
                                        value={selectedStudentLecture}
                                        onChange={(e) => setSelectedStudentLecture(e.target.value)}
                                        placeholder="Select a lecture"
                                    />
                                    <datalist id="lectures-list">
                                        {studentLectures.map((lecture) => (
                                            <option key={lecture.cod}
                                                    value={`${lecture.cod} - ${lecture.nume_disciplina}`}/>
                                        ))}
                                    </datalist>
                                </label>

                                <div className="button-group lecture-buttons">
                                    <button
                                        className="unassign-button"
                                        disabled={!selectedStudentLecture}
                                        onClick={() => unassignLecture(selectedStudentLecture.split(" - ")[0])}
                                    >
                                        Unassign Lecture
                                    </button>
                                </div>

                                {studentLectures.length === 0 && (
                                    <p className="no-lectures-message">No lectures assigned to this student.</p>
                                )}

                                <label className="profile-label">
                                    <strong>Available Lectures:</strong>
                                    <input
                                        name="all-lectures"
                                        id="all-lectures"
                                        list="all-lectures-list"
                                        className="editable-input"
                                        value={selectedLecture}
                                        onChange={(e) => setSelectedLecture(e.target.value)}
                                        placeholder="Select a lecture"
                                    />
                                    <datalist id="all-lectures-list">
                                        {allLectures.map((lecture) => (
                                            <option key={lecture.cod}
                                                    value={`${lecture.cod} - ${lecture.nume_disciplina}`}/>
                                        ))}
                                    </datalist>
                                </label>

                                <div className="button-group lecture-buttons">
                                    <button
                                        className="assign-button"
                                        disabled={!selectedLecture}
                                        onClick={() => assignLecture(selectedLecture.split(" - ")[0])}
                                    >
                                        Assign Lecture
                                    </button>
                                </div>

                                {allLectures.length === 0 && (
                                    <p className="no-lectures-message">No lectures available.</p>
                                )}

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
