import React, { useEffect, useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import NavBar from "../../navBar/navBar";
import "./lectures.css";
import { useStats } from "../../context/statsContext";

interface Links {
    self: { href: string; method: string };
    update: { href: string; method: string };
    delete: { href: string; method: string };
}

interface Lecture {
    cod: string;
    id_titular: number;
    nume_disciplina: string;
    an_studiu: number;
    tip_disciplina: string;
    categorie_disciplina: string;
    tip_examinare: string;
    _links: Links;
}

const AdminLecturesPage: React.FC = () => {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [paginationLinks, setPaginationLinks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const navigate = useNavigate();
    const { stats } = useStats();

    const [search, setSearch] = useState<string>("");
    const [year, setYear] = useState<string>("");
    const [lectureType, setLectureType] = useState<string>("");
    const [lectureCategory, setLectureCategory] = useState<string>("");
    const [examinationType, setExaminationType] = useState<string>("");
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const token = localStorage.getItem("authToken");
    const host = "http://localhost:8000";

    const buildApiUrl = (baseUrl: string) => {
        const params = new URLSearchParams();
        if (search) params.append("name", search);
        if (year) params.append("year", year);
        if (lectureType) params.append("type", lectureType);
        if (lectureCategory) params.append("category", lectureCategory);
        if (examinationType) params.append("examination", examinationType);
        params.append("items_per_page", itemsPerPage.toString());
        return baseUrl.includes("?") ? `${baseUrl}&${params.toString()}` : `${baseUrl}?${params.toString()}`;
    };

    const fetchLectures = async (url: string) => {
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

            if (!response.ok && response.status !== 404) throw new Error(response.statusText);

            setLectures([]);
            setPaginationLinks({ first: "", previous: "", next: "", last: "" });

            if (response.ok) {
                const data = await response.json();
                setLectures(data["lectures"].lectures);
                setPaginationLinks({
                    first: data.lectures["_links"]["first_page"]?.href || "",
                    previous: data.lectures["_links"]["previous_page"]?.href || "",
                    next: data.lectures["_links"]["next_page"]?.href || "",
                    last: data.lectures["_links"]["last_page"]?.href || "",
                });
            }
        } catch (error) {
            if (error instanceof Error) setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        if(!stats?._links.view_lectures){
            navigate("/dashboard");
            return;
        }

        fetchLectures(buildApiUrl(`${host}${stats?._links.view_lectures.href}`));
    }, [itemsPerPage]);

    const handlePagination = (pageUrl: string) => {
        if (!pageUrl) return;
        fetchLectures(buildApiUrl(`${host}${pageUrl}`));
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="admin-lectures-container">
            <NavBar />
            <div className="content">
                <div className="header-section">
                    <h2>Lectures List</h2>
                    <div className="filters-section">
                        <input
                            type="text"
                            placeholder="Search by name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        />
                        <select
                            className="editable-input"
                            value={lectureType}
                            onChange={(e) => setLectureType(e.target.value)}
                        >
                            <option value="">Type</option>
                            <option value="impusa">Impusa</option>
                            <option value="optionala">Optionala</option>
                            <option value="liber_aleasa">Liber Aleasa</option>
                        </select>
                        <select
                            className="editable-input"
                            value={lectureCategory}
                            onChange={(e) => setLectureCategory(e.target.value)}
                        >
                            <option value="">Category</option>
                            <option value="domeniu">Domeniu</option>
                            <option value="specialitate">Specialitate</option>
                            <option value="adiacenta">Adiacenta</option>
                        </select>
                        <select
                            className="editable-input"
                            value={examinationType}
                            onChange={(e) => setExaminationType(e.target.value)}
                        >
                            <option value="">Examination Type</option>
                            <option value="examen">Examen</option>
                            <option value="colocviu">Colocviu</option>
                        </select>
                        <button
                            onClick={() => fetchLectures(buildApiUrl(`${host}${stats?._links.view_lectures.href}`))}>Apply
                            Filters
                        </button>
                    </div>
                </div>

                <div className="admin-list-section">
                    <ul className="admin-lecture-list">
                        {lectures.map((lecture) => (
                            <li key={lecture.cod} className="admin-lecture-item">
                                <div className="admin-lecture-info">
                                    {lecture.cod} - {lecture.nume_disciplina}
                                </div>
                                <Link to={`/dashboard/lectures/${lecture.cod}`}
                                      state={{apiUrl: lecture["_links"]["self"].href}}>
                                    <button className="admin-view-details-btn">View Details</button>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>

                    <div className="pagination-buttons">
                        <button onClick={() => handlePagination(paginationLinks.first)} disabled={!paginationLinks.first}>First</button>
                        <button onClick={() => handlePagination(paginationLinks.previous)} disabled={!paginationLinks.previous}>Previous</button>
                        <button onClick={() => handlePagination(paginationLinks.next)} disabled={!paginationLinks.next}>Next</button>
                        <button onClick={() => handlePagination(paginationLinks.last)} disabled={!paginationLinks.last}>Last</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLecturesPage;
