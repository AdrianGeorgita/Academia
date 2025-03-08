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
    email: string;
    rol: string;
    _links: Links;
}

const AdminDashboard: React.FC = () => {
    const { stats, setStats } = useStats();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const [itemsPerPage, setItemsPerPage] = useState(10);

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
                const studentsResponse = await fetch(`${host}${data["_links"]["view_students"]["href"]}?items_per_page=1000`, {
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
                const teachersResponse = await fetch(`${host}${data["_links"]["view_teachers"]["href"]}?items_per_page=1000`, {
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

            setUsers(allUsers.slice(0, itemsPerPage));
        } catch (error) {
            if (error instanceof Error) setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(`${statsAPI}`);
    }, [itemsPerPage]);

    const handleCreate = (category: string) => {
        navigate("/dashboard/create", {state: {category}});
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="admin-container">
            <NavBar/>
            <h1 className="page-title">Admin Dashboard</h1>

            <div className="stats-container">
                <div className="stat-item">
                    <p className="stat-title">Total Students</p>
                    <p className="stat-number">{stats?.stats.students_count}</p>
                    <button className="create-user-button" onClick={() => handleCreate("student")}>
                        Create New Student
                    </button>
                </div>
                <div className="stat-item">
                    <p className="stat-title">Total Teachers</p>
                    <p className="stat-number">{stats?.stats.teachers_count}</p>
                    <button className="create-user-button" onClick={() => handleCreate("teacher")}>
                        Create New Teacher
                    </button>
                </div>
                <div className="stat-item">
                    <p className="stat-title">Total Lectures</p>
                    <p className="stat-number">{stats?.stats.lectures_count}</p>
                    <button className="create-user-button" onClick={() => handleCreate("lecture")}>
                        Create New Lecture
                    </button>
                </div>
            </div>


            <h2>Recent Users</h2>
            <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
            </select>

            <ul className="user-list">
                {users.map((user) => (
                    <li key={user.id} className="user-item">
                        {user.rol}: {user.prenume} {user.nume} ({user.email})

                        <Link
                            to={`/dashboard/${user.rol.toLowerCase()}s/${user.id}`}
                            state={{
                                apiUrl: user["_links"]["self"].href,
                                lecturesApi: stats?._links.view_lectures
                            }}
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
