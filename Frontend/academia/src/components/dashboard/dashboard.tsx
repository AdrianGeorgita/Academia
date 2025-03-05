import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../navBar/navBar";
import "./dashboard.css";

interface Stats {
    students_count: number;
    teachers_count: number;
    lectures_count: number;
}

interface User {
    id: number;
    prenume: string;
    nume: string;
    rol: string;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();
    const [paginationLinks, setPaginationLinks] = useState<Record<string, string>>({});

    const host = "http://localhost:8000";
    const statsAPI = "http://localhost:8000/api/academia/stats";

    const fetchUsers = async (url: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("authToken");
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.clear();
                navigate("/login");
                return;
            }

            if (!response.ok) throw new Error("Failed to fetch data");
            const data = await response.json();
            setStats(data.stats);

            let allUsers: User[] = [];

            if (data["_links"]["view_students"]) {
                const studentsResponse = await fetch(`${host}${data["_links"]["view_students"]["href"]}`, {
                    method: data["_links"]["view_students"]["method"],
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!studentsResponse.ok) throw new Error("Failed to fetch students data");

                const studentsData = await studentsResponse.json();
                const studentsWithRole = studentsData.students.map((student: User) => ({
                    ...student,
                    rol: "Student",
                }));
                allUsers = [...allUsers, ...studentsWithRole];
            }

            if (data["_links"]["view_teachers"]) {
                const teachersResponse = await fetch(`${host}${data["_links"]["view_teachers"]["href"]}`, {
                    method: data["_links"]["view_teachers"]["method"],
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!teachersResponse.ok) throw new Error("Failed to fetch teachers data");

                const teachersData = await teachersResponse.json();
                const teachersWithRole = teachersData.teachers.map((teacher: User) => ({
                    ...teacher,
                    rol: "Teacher",
                }));
                allUsers = [...allUsers, ...teachersWithRole];
            }

            allUsers.sort((a, b) => b.id - a.id);

            setUsers(allUsers.slice(0, 10));

            setPaginationLinks({
                first: data["_links"]["first_page"]?.href || "",
                previous: data["_links"]["previous_page"]?.href || "",
                next: data["_links"]["next_page"]?.href || "",
                last: data["_links"]["last_page"]?.href || "",
            });
        } catch (error) {
            if (error instanceof Error) setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(`${statsAPI}`);
    }, []);

    const handleCreateUser = () => {
        navigate("/admin/create-user");
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="admin-container">
            <NavBar />
            <h1 className="page-title">Admin Dashboard</h1>

            <div className="stats-container">
                <p>Total Students: {stats?.students_count}</p>
                <p>Total Teachers: {stats?.teachers_count}</p>
                <p>Total Lectures: {stats?.lectures_count}</p>
            </div>

            <button className="create-user-button" onClick={handleCreateUser}>
                Create New User
            </button>

            <h2>Recent Users</h2>

            <ul className="user-list">
                {users.map((user) => (
                    <li key={user.id} className="user-item">
                        {user.rol} - {user.prenume} {user.nume}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AdminDashboard;
