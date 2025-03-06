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

interface UsersListProps {
    category: "students" | "teachers";
}

const UserManagementPage: React.FC<UsersListProps> = ({ category }) => {
    const [profile, setProfile] = useState<Student | Teacher | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const location = useLocation();

    const { id} = useParams<{ id: string}>();
    const { apiUrl } = location.state || {};

    const HOST_URL = "http://localhost:8000";

    useEffect(() => {
        const fetchProfile = async () => {
            if(!apiUrl) return;

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

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!profile) return <div className="error">No profile found!</div>;

    return (
        <div>
            <NavBar />
            <div className="profile-page-container">
                <h1 className="profile-title">Admin Profile Management</h1>
                <div className="profile-details">
                    <label className="profile-label">
                        <strong>First Name:</strong>
                        <input
                            type="text"
                            value={profile.prenume}
                            onChange={(e) => setProfile({ ...profile, prenume: e.target.value })}
                            className="editable-input"
                        />
                    </label>
                    <label className="profile-label">
                        <strong>Last Name:</strong>
                        <input
                            type="text"
                            value={profile.nume}
                            onChange={(e) => setProfile({ ...profile, nume: e.target.value })}
                            className="editable-input"
                        />
                    </label>
                    <p><strong>Email</strong>: {profile.email}</p>

                    {'ciclu_studii' in profile && (
                        <>
                            <label className="profile-label">
                                <strong>Study Cycle:</strong>
                                <input
                                    type="text"
                                    value={profile.ciclu_studii}
                                    onChange={(e) => setProfile({ ...profile, ciclu_studii: e.target.value })}
                                    className="editable-input"
                                />
                            </label>
                            <label className="profile-label">
                                <strong>Year of Study:</strong>
                                <input
                                    type="number"
                                    value={profile.an_studiu}
                                    onChange={(e) => setProfile({ ...profile, an_studiu: Number(e.target.value) })}
                                    className="editable-input"
                                />
                            </label>
                            <label className="profile-label">
                                <strong>Group:</strong>
                                <input
                                    type="number"
                                    value={profile.grupa}
                                    onChange={(e) => setProfile({ ...profile, grupa: Number(e.target.value) })}
                                    className="editable-input"
                                />
                            </label>
                        </>
                    )}

                    {'grad_didactic' in profile && (
                        <>
                            <label className="profile-label">
                                <strong>Grade:</strong>
                                <input
                                    type="text"
                                    value={profile.grad_didactic}
                                    onChange={(e) => setProfile({ ...profile, grad_didactic: e.target.value })}
                                    className="editable-input"
                                />
                            </label>
                            <label className="profile-label">
                                <strong>Affiliation:</strong>
                                <input
                                    type="text"
                                    value={profile.afiliere}
                                    onChange={(e) => setProfile({ ...profile, afiliere: e.target.value })}
                                    className="editable-input"
                                />
                            </label>
                            <label className="profile-label">
                                <strong>Association Type:</strong>
                                <input
                                    type="text"
                                    value={profile.tip_asociere}
                                    onChange={(e) => setProfile({ ...profile, tip_asociere: e.target.value })}
                                    className="editable-input"
                                />
                            </label>
                        </>
                    )}
                </div>
                <div className="button-group">
                    <button className="update-button" onClick={handleUpdate}>Update Profile</button>
                    <button className="delete-button" onClick={handleDelete}>Delete User</button>
                </div>
            </div>
        </div>

    );
};

export default UserManagementPage;
