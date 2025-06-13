import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css';
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
    tip_asociere: number;
    afiliere: number;
}

const ProfilePage: React.FC = () => {
    const [profile, setProfile] = useState<Student | Teacher | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    const HOST_URL = "http://localhost:8000"

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) navigate('/login');

                const profilePath = localStorage.getItem('profilePath');
                if (!profilePath) return;

                const response = await fetch(`${profilePath}`, {
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
                setProfile(data.student || data.teacher);
            } catch (error) {
                if (error instanceof Error) setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

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
                <h1 className="profile-title">Profile</h1>
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
                    <p><strong>Email</strong>: {profile.email} </p>
                    {/*<label className="profile-label">*/}
                    {/*    */}
                    {/*    <input*/}
                    {/*        type="email"*/}
                    {/*        value={profile.email}*/}
                    {/*        onChange={(e) => setProfile({ ...profile, email: e.target.value })}*/}
                    {/*        className="editable-input"*/}
                    {/*    />*/}
                    {/*</label>*/}
                    {'ciclu_studii' in profile && (
                        <>
                            <p><strong>Study Cycle:</strong> {profile.ciclu_studii}</p>
                            <p><strong>Year of Study:</strong> {profile.an_studiu}</p>
                            <p><strong>Group:</strong> {profile.grupa}</p>
                        </>
                    )}
                    {'grad_didactic' in profile && (
                        <>
                            <p><strong>Grade:</strong> {profile.grad_didactic}</p>
                            <p><strong>Affiliation:</strong> {profile.afiliere}</p>
                            <p><strong>Association Type:</strong> {profile.tip_asociere}</p>
                        </>
                    )}
                </div>
                <div className="button-group">
                    <button className="back-button" onClick={() => navigate('/')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Main
                    </button>
                    <button className="update-button" onClick={handleUpdate}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Update Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
