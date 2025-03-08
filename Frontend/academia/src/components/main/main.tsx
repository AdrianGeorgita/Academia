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
        first_page?: { href: string; method: string  };
        previous_page?: { href: string; method: string  };
        next_page?: { href: string; method: string  };
        last_page?: { href: string; method: string  };
    };
}

const MainPage: React.FC = () => {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const [noLectures, setNoLectures] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [year, setYear] = useState<string>('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [paginationLinks, setPaginationLinks] = useState<LectureResponse['_links'] | null>({
        self: { href: '', method: '' },
        parent: { href: '', method: '' },
        create: undefined,
        delete: undefined,
        first_page: undefined,
        previous_page: undefined,
        next_page: undefined,
        last_page: undefined,
    });

    const HOST_URL = "http://localhost:8000";

    const navigate = useNavigate();

    let home_page_api = ""
    if (window.location.pathname === "/" || window.location.pathname === "/lectures") {
        home_page_api = localStorage.getItem("homePage") || "";
    } else if (window.location.pathname === "/my-lectures") {
        home_page_api = localStorage.getItem("myLecturesAPI") || "";
    }

    const buildApiUrl = (baseUrl: string) => {
        const params = new URLSearchParams();

        if (search) {
            params.append("name", search);
        }

        if (year && parseInt(year) >= 1 && parseInt(year) <= 4) {
            params.append("year", year);
        }

        if (!baseUrl.match("items_per_page")) {
            params.append("items_per_page", itemsPerPage.toString());
        }

        const queryString = params.toString();
        return baseUrl.includes('?') ? `${baseUrl}&${queryString}` : `${baseUrl}?${queryString}`;
    };

    const fetchLectures = async (url: string) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) navigate('/login');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                localStorage.clear();
                navigate("/login");
            }

            if(response.status === 404) {
                setNoLectures(true);
                setPaginationLinks({
                    self: { href: '', method: '' },
                    parent: { href: '', method: '' },
                    create: undefined,
                    delete: undefined,
                    first_page: undefined,
                    previous_page: undefined,
                    next_page: undefined,
                    last_page: undefined,
                });
                setLectures([]);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch lectures');
            }

            setNoLectures(false)

            const data = await response.json();
            setLectures(data["lectures"].lectures);
            console.log(data["lectures"]._links);
            setPaginationLinks(data["lectures"]._links);

            if (data.lectures._links.teacher_lectures)
                localStorage.setItem("myLecturesAPI", data.lectures._links.teacher_lectures.href);

        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePagination = (pageUrl: string) => {
        if (!pageUrl) return;
        fetchLectures(buildApiUrl(`${HOST_URL}${pageUrl}`));
    };

    useEffect(() => {

        if(home_page_api.match("stats")) {
            navigate('/dashboard');
        }

        fetchLectures(buildApiUrl(home_page_api));
    }, [home_page_api, itemsPerPage, search, year, noLectures]);

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

            {/* Filters Section */}
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
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                </select>
                <button onClick={() => fetchLectures(buildApiUrl(home_page_api))}>
                    Apply Filters
                </button>
            </div>

            {noLectures && (
                <p className="no-lectures-message">No lectures available!</p>
            )}

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

            <div className="pagination-buttons">
                <button onClick={() => handlePagination(paginationLinks?.first_page?.href || '')} disabled={!paginationLinks?.first_page}>
                    First
                </button>
                <button onClick={() => handlePagination(paginationLinks?.previous_page?.href || '')} disabled={!paginationLinks?.previous_page}>
                    Previous
                </button>
                <button onClick={() => handlePagination(paginationLinks?.next_page?.href || '')} disabled={!paginationLinks?.next_page}>
                    Next
                </button>
                <button onClick={() => handlePagination(paginationLinks?.last_page?.href || '')} disabled={!paginationLinks?.last_page}>
                    Last
                </button>
            </div>
        </div>
    );
};

export default MainPage;
