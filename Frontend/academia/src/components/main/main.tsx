import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './main.css'; // Import the CSS file
import NavBar from "../navBar/navBar";

interface Lecture {
    cod: string;
    id_titular: number;
    nume_disciplina: string;
    an_studiu: number;
    tip_disciplina: string;
    categorie_disciplina: string;
    tip_examinare: string;
    _links: {
        self: {
            href: string;
        };
    };
}

interface LectureResponse {
    lectures: Lecture[];
    _links: {
        self: {
            href: string;
        };
        parent: {
            href: string;
        };
    };
}

const MainPage: React.FC = () => {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [links, setLinks] = useState<LectureResponse['_links'] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    const HOME_PAGE_FETCH_URL = 'http://localhost:8000/api/academia/students/1/lectures'

    useEffect(() => {
        const fetchLectures = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(HOME_PAGE_FETCH_URL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch lectures');
                }

                const data = await response.json();
                setLectures(data["student-lectures"].lectures);
                setLinks(data["student-lectures"]._links);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLectures();
    }, []);

    const handleViewLecture = (path: string) => {
        const cod = path.split('/').pop()!
        navigate(`/lecture/${cod}`, {state: { path }});
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    if(links?.parent) {
        localStorage.setItem('profilePath', links?.parent.href);
    }

    return (
        <div className="main-container">
            <NavBar />
            <h1 className="page-title">Lectures</h1>
            <ul className="lecture-list">
                {lectures.map((lecture) => (
                    <li key={lecture.cod} className="lecture-item">
                        <h3>{lecture.nume_disciplina} - {lecture.cod}</h3>
                        <p><strong>Year of Study:</strong> {lecture.an_studiu}</p>
                        <p><strong>Subject Type:</strong> {lecture.tip_disciplina}</p>
                        <p><strong>Category:</strong> {lecture.categorie_disciplina}</p>
                        <p><strong>Examination Type:</strong> {lecture.tip_examinare}</p>
                        <button className="view-lecture-button"
                                onClick={() => handleViewLecture(lecture._links.self.href)}>
                            View Lecture
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MainPage;
