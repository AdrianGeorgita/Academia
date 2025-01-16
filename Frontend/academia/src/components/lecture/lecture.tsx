import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import './lecture.css';
import NavBar from "../navBar/navBar";

interface Material {
    "nume-fisier": string;
    path: string;
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
        materials: {
            probe_evaluare: {
                activitate_laborator: number;
                examinare_finala: number;
                proiect: number;
            };
            "materiale-curs": Material[];
            "materiale-laborator": Material[];
        } | null;
        _links: {
            self: string;
            parent: string;
        };
    } | null;
}

const LecturePage: React.FC = () => {
    const { cod } = useParams<{ cod: string }>();
    const [lectureDetails, setLectureDetails] = useState<LectureDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const location = useLocation();
    const { path } = location.state || {};

    const host = 'http://localhost:8000';
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLectureDetails = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${host}${path}`, {
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
                setLectureDetails(data);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLectureDetails();
    }, [path, cod]);


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
    };

    return (
        <div>
            <NavBar />
            <div className="lecture-page-container">
                <button className="back-button" onClick={() => navigate('/main')}>Back to Main</button>

                <div className="section-container lecture-details">
                    <h1>{lectureDetails.lecture.nume_disciplina}</h1>
                    <p><strong>Code:</strong> {lectureDetails.lecture.cod}</p>
                    <p><strong>Year of Study:</strong> {lectureDetails.lecture.an_studiu}</p>
                    <p><strong>Subject Type:</strong> {lectureDetails.lecture.tip_disciplina}</p>
                    <p><strong>Category:</strong> {lectureDetails.lecture.categorie_disciplina}</p>
                    <p><strong>Examination Type:</strong> {lectureDetails.lecture.tip_examinare}</p>
                </div>

                <div className="section-container">
                    <h3>Course Materials</h3>
                    <ul className="materials-list">
                        {materials["materiale-curs"].length > 0 ? (
                            materials["materiale-curs"].map((material, index) => (
                                <li key={index}>
                                    <p><strong>File Name:</strong> {material["nume-fisier"]}</p>
                                    <p><strong>Path:</strong> {material.path}</p>
                                </li>
                            ))
                        ) : (
                            <li>No course materials available.</li>
                        )}
                    </ul>
                </div>

                <div className="section-container">
                    <h3>Laboratory Materials</h3>
                    <ul className="materials-list">
                        {materials["materiale-laborator"].length > 0 ? (
                            materials["materiale-laborator"].map((material, index) => (
                                <li key={index}>
                                    <p><strong>File Name:</strong> {material["nume-fisier"]}</p>
                                    <p><strong>Path:</strong> {material.path}</p>
                                </li>
                            ))
                        ) : (
                            <li>No laboratory materials available.</li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LecturePage;
