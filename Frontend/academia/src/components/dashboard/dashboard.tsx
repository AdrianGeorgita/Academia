import React, { useEffect, useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import NavBar from "../navBar/navBar";
import "./dashboard.css";
import { useStats } from "../context/statsContext";

interface Links {
    self: { href: string; method: string };
    parent: { href: string; method: string };
    update: { href: string; method: string };
    delete: { href: string; method: string };
}

interface User {
    id: number;
    prenume: string;
    nume: string;
    rol: string;
    _links: Links;
}

const AdminDashboard: React.FC = () => {
    const { stats, setStats } = useStats();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();

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
            setStats(data);

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
                <p>Total Students: {stats?.stats.students_count}</p>
                <p>Total Teachers: {stats?.stats.teachers_count}</p>
                <p>Total Lectures: {stats?.stats.lectures_count}</p>
            </div>

            <button className="create-user-button" onClick={handleCreateUser}>
                Create New User
            </button>

            <h2>Recent Users</h2>

            <ul className="user-list">
                {users.map((user) => (
                    <li key={user.id} className="user-item">
                        {user.rol} - {user.prenume} {user.nume}

                        <Link
                            to={`/dashboard/${user.rol.toLowerCase()}s/${user.id}`}
                            state={{apiUrl: user["_links"]["self"].href, lecturesApi: stats ? stats : ["view_lectures"]}}
                        >
                            <button className="view-profile-btn">View Profile</button>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AdminDashboard;
