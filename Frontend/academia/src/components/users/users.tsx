import React, { useEffect, useState } from "react";
import NavBar from "../navBar/navBar";
import "./users.css";

interface User {
    id: number;
    prenume: string;
    nume: string;
}

interface UsersListProps {
    category: "students" | "teachers";
}

const UsersList: React.FC<UsersListProps> = ({ category }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [paginationLinks, setPaginationLinks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const token = localStorage.getItem("authToken");
    const host = "http://localhost:8000";
    const apiEndpoint = `${host}/api/academia/${category}`;

    // Function to fetch users based on the provided URL (including pagination links)
    const fetchUsers = async (url: string) => {
        try {
            if (!token) throw new Error("Unauthorized");

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.clear();
                window.location.href = "/login";
            }

            if (!response.ok) throw new Error("Failed to fetch users");

            const data = await response.json();
            setUsers(data[category]); // Fetch students or teachers
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

    // Initially fetch the data when the component mounts
    useEffect(() => {
        fetchUsers(apiEndpoint); // Fetch data on component mount
    }, [category]); // Refetch data when category changes

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="users-container">
            <NavBar />
            <h2>{category === "students" ? "Students" : "Teachers"} List</h2>
            <ul className="user-list">
                {users.map((user) => (
                    <li key={user.id} className="user-item">
                        {user.prenume} {user.nume}
                    </li>
                ))}
            </ul>

            {/* Pagination Buttons */}
            <div className="pagination-buttons">
                <button
                    onClick={() => fetchUsers(`${host}${paginationLinks.first}`)}
                    disabled={!paginationLinks.first}
                >
                    First
                </button>
                <button
                    onClick={() => fetchUsers(`${host}${paginationLinks.previous}`)}
                    disabled={!paginationLinks.previous}
                >
                    Previous
                </button>
                <button
                    onClick={() => fetchUsers(`${host}${paginationLinks.next}`)}
                    disabled={!paginationLinks.next}
                >
                    Next
                </button>
                <button
                    onClick={() => fetchUsers(`${host}${paginationLinks.last}`)}
                    disabled={!paginationLinks.last}
                >
                    Last
                </button>
            </div>
        </div>
    );
};

export default UsersList;
