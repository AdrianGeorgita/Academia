import React, { useEffect, useState } from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
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
        self: { href: string; method: string };
        parent: { href: string; method: string };
        update?: { href: string; method: string };
    };
}

interface LectureResponse {
    lectures: Lecture[];
    _links: {
        self: { href: string; method: string };
        parent: { href: string; method: string };
        create?: { href: string; method: string };
        delete?: { href: string; method: string };
    };
}

const MainPage: React.FC = () => {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [links, setLinks] = useState<LectureResponse['_links'] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    let home_page_api = ""
    if (window.location.pathname === "/" || window.location.pathname === "/lectures") {
        home_page_api = localStorage.getItem("homePage") || "";
    } else if (window.location.pathname === "/my-lectures") {
        home_page_api = localStorage.getItem("myLecturesAPI") || "";
    }


    useEffect(() => {
        const fetchLectures = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if(!token)
                    navigate('/login')

                console.log(window.location.pathname);

                const response = await fetch(home_page_api, {
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
                setLectures(data["lectures"].lectures);
                setLinks(data["lectures"]._links);

                if(data.lectures._links.teacher_lectures)
                    localStorage.setItem("myLecturesAPI", data.lectures._links.teacher_lectures.href)

            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLectures();
    }, [navigate]);

    const handleViewLecture = (path: string) => {
        const cod = path.split('/').pop()!;
        navigate(`/lectures/${cod}`, { state: { path } });
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="main-container">
            <NavBar />
            <h1 className="page-title">Lectures</h1>
            <ul className="lecture-list">
                {lectures.map((lecture) => (
                    <li key={lecture.cod} className="lecture-item">
                        <h3>
                            {lecture.nume_disciplina} - {lecture.cod}
                        </h3>
                        <p><strong>Year of Study:</strong> {lecture.an_studiu}</p>
                        <p><strong>Subject Type:</strong> {lecture.tip_disciplina}</p>
                        <p><strong>Category:</strong> {lecture.categorie_disciplina}</p>
                        <p><strong>Examination Type:</strong> {lecture.tip_examinare}</p>

                        {lecture._links.update && (
                            <p className="coordinator-label">
                                You are the coordinator of this lecture.
                            </p>
                        )}

                        <button
                            className="view-lecture-button"
                            onClick={() => handleViewLecture(lecture._links.self.href)}
                        >
                            View Lecture
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MainPage;
