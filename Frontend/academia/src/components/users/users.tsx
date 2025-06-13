import React, { useEffect, useState } from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import NavBar from "../navBar/navBar";
import "./users.css";
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
    ciclu_studii: string;
    an_studiu: number;
    grupa: number;
    _links: Links;
}

interface UsersListProps {
    category: "students" | "teachers";
}

const UsersList: React.FC<UsersListProps> = ({ category }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [paginationLinks, setPaginationLinks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const { stats } = useStats();

    const navigate = useNavigate();

    const [search, setSearch] = useState<string>("");
    const [degree, setDegree] = useState<string>("");
    const [year, setYear] = useState<string>("");
    const [group, setGroup] = useState<string>("");

    const [teachingDegree, setTeachingDegree] = useState<string>("");
    const [associationType, setAssociationType] = useState<string>("");
    const [affiliation, setAffiliation] = useState<string>("");

    const [itemsPerPage, setItemsPerPage] = useState(10);

    const token = localStorage.getItem("authToken");
    const host = "http://localhost:8000";

    const buildApiUrl = (baseUrl: string) => {
        const params = new URLSearchParams();
        if (search) {
            if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(search)) {
                params.append("email", search);
            } else {
                const nameParts = search.trim().split(" ");
                if (nameParts.length === 2) {
                    params.append("surname", nameParts[1]);
                    params.append("name", nameParts[0]);
                } else {
                    params.append("name", search);
                }
            }
        }

        if (category === "students") {
            if (degree) params.append("degree", degree);
            if (year) params.append("year", year);
            if (group) params.append("group", group);
        }

        if (category === "teachers") {
            if (teachingDegree) params.append("teachingDegree", teachingDegree);
            if (associationType) params.append("associationType", associationType);
            if (affiliation) params.append("affiliation", affiliation);
        }

        params.append("items_per_page", itemsPerPage.toString());

        const queryString = params.toString();
        return baseUrl.includes("?") ? `${baseUrl}&${queryString}` : `${baseUrl}?${queryString}`;
    };

    const fetchUsers = async (url: string) => {
        try {
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
                window.location.href = "/login";
            }

            if (!response.ok && response.status !== 404) throw new Error(response.statusText);

            setUsers([])
            setPaginationLinks({
                first: "",
                previous: "",
                next: "",
                last: ""
            })

            if (response.ok) {
                const data = await response.json();
                setUsers(data[category]);
                setPaginationLinks({
                    first: data["_links"]["first_page"]?.href || "",
                    previous: data["_links"]["previous_page"]?.href || "",
                    next: data["_links"]["next_page"]?.href || "",
                    last: data["_links"]["last_page"]?.href || "",
                });
            }
        } catch (error) {
            if (error instanceof Error) setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        fetchUsers(buildApiUrl(`${host}/api/academia/${category}`));

    }, [category, itemsPerPage]);

    const handlePagination = (pageUrl: string) => {
        if (!pageUrl) return;
        fetchUsers(buildApiUrl(`${host}${pageUrl}`));
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="users-container">
            <NavBar />
            <div className="content">
                <div className="header-section">
                    <h2>{category === "students" ? "Students" : "Teachers"} List</h2>
                    <div className="filters-section">
                        <input
                            type="text"
                            placeholder="Search name or email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {category === "students" && (
                            <>
                                <select
                                    className="editable-input"
                                    value={degree}
                                    onChange={(e) => setDegree(e.target.value)}
                                >
                                    <option value="">Study Cycle</option>
                                    <option value="licenta">Licenta</option>
                                    <option value="master">Master</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Year"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Group"
                                    value={group}
                                    onChange={(e) => setGroup(e.target.value)}
                                />
                            </>
                        )}
                        {category === "teachers" && (
                            <>
                                <select
                                    className="editable-input"
                                    value={teachingDegree}
                                    onChange={(e) => setTeachingDegree(e.target.value)}
                                >
                                    <option value="">Teaching Degree</option>
                                    <option value="prof">Profesor</option>
                                    <option value="conf">Conferentiar</option>
                                    <option value="sef_lucr">Sef Lucrari</option>
                                    <option value="asist">Asistent</option>
                                </select>
                                <select
                                    className="editable-input"
                                    value={associationType}
                                    onChange={(e) => setAssociationType(e.target.value)}
                                >
                                    <option value="titular">Association Type</option>
                                    <option value="titular">Titular</option>
                                    <option value="asociat">Asociat</option>
                                    <option value="extern">Extern</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Affiliation"
                                    value={affiliation}
                                    onChange={(e) => setAffiliation(e.target.value)}
                                />
                            </>
                        )}
                        <button onClick={() => fetchUsers(buildApiUrl(`${host}/api/academia/${category}`))}>
                            Apply Filters
                        </button>
                    </div>
                </div>

                <div className="list-section">
                    <ul className="user-list">
                        {users.map((user) => (
                            <li key={user.id} className="user-item">
                                <div className="user-info">
                                    {user.prenume} {user.nume} ({user.email})
                                </div>

                                <Link
                                    to={`/dashboard/${category}/${user.id}`}
                                    state={{apiUrl: user["_links"]["self"].href, lecturesApi: stats?._links.view_lectures}}
                                >
                                    <button className="view-profile-btn">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <path d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5z"></path>
                                        </svg>
                                        View Profile
                                    </button>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>


                    <div className="pagination-buttons">
                        <button onClick={() => handlePagination(paginationLinks.first)}
                                disabled={!paginationLinks.first}>
                            First
                        </button>
                        <button onClick={() => handlePagination(paginationLinks.previous)}
                                disabled={!paginationLinks.previous}>
                            Previous
                        </button>
                        <button onClick={() => handlePagination(paginationLinks.next)} disabled={!paginationLinks.next}>
                            Next
                        </button>
                        <button onClick={() => handlePagination(paginationLinks.last)} disabled={!paginationLinks.last}>
                            Last
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersList;
