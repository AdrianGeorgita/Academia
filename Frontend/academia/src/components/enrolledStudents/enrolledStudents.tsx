import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import './enrolledStudents.css';
import NavBar from "../navBar/navBar";

interface Student {
    id: number;
    nume: string;
    prenume: string;
    email: string;
    ciclu_studii: string;
    an_studiu: number;
    grupa: number;
    _links: {
        self: {
            href: string;
            method: string;
        };
        parent: {
            href: string;
            method: string;
        };
        create: {
            href: string;
            method: string;
        };
    };
}

interface StudentsResponse {
    students: Student[];
}

const EnrolledStudents: React.FC = () => {
    const { cod } = useParams<{ cod: string }>();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const API_HOST = "http://localhost:8000"

    useEffect(() => {
        if (!cod) return;
        const fetchStudents = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('authToken');
                if (!token) navigate('/login');

                const studentsAPI = localStorage.getItem("enrolledStudents") || ""
                if (studentsAPI === "")
                    throw new Error("No API available!")

                const apiBase = studentsAPI.split('=')[0] + '=';

                const response = await fetch(`${API_HOST}${apiBase}${cod}`, {
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
                const data: StudentsResponse = await response.json();
                setStudents(data.students);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [cod]);

    return (
        <div className="main-container">
            <NavBar />
            <h1 className="page-title">Enrolled Students for Lecture {cod}</h1>
            {loading && <p className="loading">Loading students...</p>}
            {error && <p className="error">{error}</p>}
            <ul className="student-list">
                {students.length > 0 ? (
                    students.map((student) => (
                        <li key={student.id} className="student-item">
                            <h3>
                                {student.prenume} {student.nume}
                            </h3>
                            <p><strong>Email:</strong> <a href={`mailto:${student.email}`}>{student.email}</a></p>
                            <p><strong>Ciclu Studii:</strong> {student.ciclu_studii}</p>
                            <p><strong>An:</strong> {student.an_studiu}</p>
                            <p><strong>Grupa:</strong> {student.grupa}</p>
                        </li>
                    ))
                ) : (
                    <p>No students found for this lecture.</p>
                )}
            </ul>
        </div>
    );
};

export default EnrolledStudents;
