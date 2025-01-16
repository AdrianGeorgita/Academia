import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css'; // Add appropriate styling
import NavBar from "../navBar/navBar";

interface Links {
    self: { href: string };
    parent: { href: string };
    lectures: { href: string };
    update: { href: string; method: string };
    delete: { href: string; method: string };
}

interface Student {
    id: number;
    nume: string;
    prenume: string;
    email: string;
    ciclu_studii: string;
    an_studiu: number;
    grupa: number;
    _links: Links;
}

const ProfilePage: React.FC = () => {
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();
    const HOST_URL: string = 'http://localhost:8000';

    useEffect(() => {
        const fetchStudentProfile = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const profilePath = localStorage.getItem('profilePath');
                if (!profilePath) return;

                const response = await fetch(`${HOST_URL}${profilePath}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch student profile');
                }

                const data = await response.json();
                setStudent(data.student);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStudentProfile();
    }, []);

    const handleUpdate = async () => {
        if (!student || !student._links.update) return;

        try {
            const token = localStorage.getItem('authToken');
            const { href, method } = student._links.update;

            const response = await fetch(`${HOST_URL}${href}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    first_name: student.nume,
                    last_name: student.prenume,
                    email: student.email,
                    study_cycle: student.ciclu_studii,
                    study_year: student.an_studiu,
                    group: student.grupa,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            alert('Profile updated successfully');
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
                alert('Error updating profile: ' + error.message);
            }
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    if (!student) {
        return <div className="error">No student profile found!</div>;
    }

    return (
        <div>
            <NavBar />
            <div className="profile-page-container">
                <h1 className="profile-title">Student Profile</h1>
                <div className="profile-details">
                    <label className="profile-label">
                        <strong>Name:</strong>
                        <input
                            type="text"
                            value={`${student.nume} ${student.prenume}`}
                            onChange={(e) =>
                                setStudent({
                                    ...student,
                                    nume: e.target.value.split(' ')[0],
                                    prenume: e.target.value.split(' ')[1] || ''
                                })
                            }
                            className="editable-input"
                        />
                    </label>
                    <label className="profile-label">
                        <strong>Email:</strong>
                        <input
                            type="email"
                            value={student.email}
                            onChange={(e) =>
                                setStudent({ ...student, email: e.target.value })
                            }
                            className="editable-input"
                        />
                    </label>
                    <p><strong>Study Cycle:</strong> {student.ciclu_studii}</p>
                    <p><strong>Year of Study:</strong> {student.an_studiu}</p>
                    <p><strong>Group:</strong> {student.grupa}</p>
                </div>
                <div className="button-group">
                    <button className="back-button" onClick={() => navigate('/main')}>Back to Main</button>
                    <button className="update-button" onClick={handleUpdate}>Update Profile</button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
