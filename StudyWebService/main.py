import math, json
from enum import Enum
from typing import Union, Annotated

from peewee import MySQLDatabase
from peewee import Model, CharField, IntegerField
from playhouse.shortcuts import model_to_dict

from fastapi import FastAPI, HTTPException, Request, Body, Response, Header
from fastapi.openapi.utils import get_openapi
from re import match
import requests

import grpc
import auth_pb2, auth_pb2_grpc

from fastapi.middleware.cors import CORSMiddleware

db = MySQLDatabase(database='study_service_db', user='posadmin', passwd='passwdpos', host='study_db', port=3306)

app = FastAPI()

origins = [
    "http://localhost:8000",
    "http://localhost:8004",
    "http://localhost:8008",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE"],
    allow_headers=["authorization", "content-type"],
)

db.connect()

email_regex = r"^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$"

class BaseModel(Model):
    class Meta:
        database = db


class Teacher(BaseModel):
    id = IntegerField(primary_key=True)
    nume = CharField()
    prenume = CharField()
    email = CharField(unique=True)
    grad_didactic = CharField()
    tip_asociere = CharField()
    afiliere = CharField()

    class Meta:
        db_table = 'profesor'


class Student(BaseModel):
    id = IntegerField(primary_key=True)
    nume = CharField()
    prenume = CharField()
    email = CharField(unique=True)
    ciclu_studii = CharField()
    an_studiu = IntegerField()
    grupa = IntegerField()

    class Meta:
        db_table = 'student'


class Lecture(BaseModel):
    cod = CharField(primary_key=True)
    id_titular = IntegerField()
    nume_disciplina = CharField()
    an_studiu = IntegerField()
    tip_disciplina = CharField()
    categorie_disciplina = CharField()
    tip_examinare = CharField()

    class Meta:
        db_table = 'disciplina'


class Student_Disciplina(BaseModel):
    DisciplinaID = CharField(primary_key=True)
    StudentID = IntegerField()

    class Meta:
        db_table = 'join_ds'


class TeacherDegree(Enum):
    ASIST = "asist"
    SEF_LUCR = "sef lucr"
    CONF = "conf"
    PROF = "prof"


class TeacherAssociation(Enum):
    TITULAR = "titular"
    ASOCIAT = "asociat"
    EXTERN = "extern"


class StudentCycle(Enum):
    LICENTA = "licenta"
    MASTER = "master"


class LectureType(Enum):
     IMPUSA = "impusa"
     OPTIONALA = "optionala"
     LIBER_ALEASA = "liber_aleasa"


class LectureCategory(Enum):
    DOMENIU = "domeniu"
    SPECIALITATE = "specialitate"
    ADIACENTA = "adiacenta"


class LectureExamination(Enum):
    COLOCVIU = "colocviu"
    EXAMEN = "examen"

MAX_ITEMS_PER_PAGE = 100


def ValidateIdentity(token: str):
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header invalid or not present")
    else:
        jws = token.split("Bearer ")[1]

        with grpc.insecure_channel("auth_service:50051") as channel:
            stub = auth_pb2_grpc.AuthenticationStub(channel)
            response = stub.Validate(auth_pb2.ValidationRequest(jws=jws))

        res_split = response.status.split('\n')

        if res_split[0] == "Success":
            if res_split[1] == "Valid Token":
                res_json = json.loads(res_split[2])
                return res_json["role"], res_json["sub"]
            else:
                raise HTTPException(status_code=401, detail=res_split[1])
        else:
            raise HTTPException(status_code=401, detail=res_split[1])


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Custom title",
        version="2.5.0",
        summary="This is a very custom OpenAPI schema",
        description="Here's a longer description of the custom **OpenAPI** schema",
        routes=app.routes,
    )
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

default_responses = {
    401: {"description": "Unauthorized"},
    403: {"description": "Forbidden"},
    500: {"description": "Internal Server Error"},
}


@app.get("/")
def read_root():
    return custom_openapi() #{"Hello": "World"}


@app.get("/api/academia/stats", responses = default_responses)
def read_stats(
        request: Request,
        authorization: Annotated[str, Header()],
):
    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    res = Teacher.select()
    teachers_count = res.count()

    res = Student.select()
    students_count = res.count()

    res = Lecture.select()
    lectures_count = res.count()

    parent_path = "/".join(request.url.path.strip("/").split("/")[:-1])
    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": f"/{parent_path}",
            "method": "GET",
        },
        "view_students": {
            "href": f"/{parent_path}/students",
            "method": "GET",
        },
        "view_teachers": {
            "href": f"/{parent_path}/teachers",
            "method": "GET",
        },
        "view_lectures": {
            "href": f"/{parent_path}/lectures",
            "method": "GET",
        },
        "add_student": {
            "href": f"/{parent_path}/students",
            "method": "POST",
        },
        "add_teacher": {
            "href": f"/{parent_path}/teachers",
            "method": "POST",
        },
        "add_lecture": {
            "href": f"/{parent_path}/lectures",
            "method": "POST",
        },
    }

    stats = {
        "stats": {
            "students_count": students_count,
            "teachers_count": teachers_count,
            "lectures_count": lectures_count,
        },
        "_links": links
    }
    return stats


# TEACHERS
@app.get("/api/academia/teachers", responses=(
        {
            **default_responses,
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            }
        }
    )
)


def read_teachers(
        request: Request,
        authorization: Annotated[str, Header()],
        name: Union[str, None] = None,
        teachingDegree: Union[str, None] = None,
        associationType: Union[str, None] = None,
        affiliation: Union[str, None] = None,
        email: Union[str, None] = None,
        surname: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):
    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    filters = []
    if name:
        filters.append(Teacher.nume.contains(name.strip()))
    if surname:
        filters.append(Teacher.prenume.contains(surname.strip()))
    if email:
        filters.append(Teacher.email.contains(email.strip()))
    if teachingDegree:
        filters.append(Teacher.grad_didactic.contains(teachingDegree.strip()))
    if associationType:
        filters.append(Teacher.tip_asociere.contains(associationType.strip()))
    if affiliation:
        filters.append(Teacher.afiliere.contains(affiliation.strip()))

    res = Teacher.select().where(*filters).order_by(Teacher.prenume) if filters else Teacher.select()

    if not res:
        raise HTTPException(status_code=404, detail="Teachers not found")

    total_teachers = res.count()

    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page
    total_pages = math.ceil(total_teachers / items_per_page)

    if start_index >= total_teachers:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        },
        "create": {
            "href": request.url.path,
            "method": "POST",
        },
    }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {"href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
                              "method": "GET"}
        links["last_page"] = {"href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
                              "method": "GET"}

    teachers = []
    for teacher in res:
        teacher_dict = model_to_dict(teacher)
        teacher_dict["_links"] = {
            "self": {
                "href": f"{request.url.path}/{teacher_dict["id"]}",
                "method": "GET",
            },
            "parent": {
                "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
                "method": "GET",
            }
        }

        if role == "admin":
            teacher_dict["_links"]["update"] = {
                "href": f"{request.url.path}/{teacher_dict["id"]}",
                "method": "PUT",
            }
            teacher_dict["_links"]["delete"] = {
                "href": f"{request.url.path}/{teacher_dict["id"]}",
                "method": "DELETE",
            }

        teachers.append(teacher_dict)

    return {"teachers": teachers, "_links": links}


@app.get("/api/academia/teachers/{teacher_id}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_teacher(teacher_id: int, request: Request, authorization: Annotated[str, Header()]):
    role, user_id = ValidateIdentity(authorization)
    if (role not in ["profesor", "admin"]) or (role == "procesor" and (teacher_id != int(user_id))):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer")

    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return {
        "teacher": {
            **model_to_dict(teacher),
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                },
                "lectures": {
                    "href": request.url.path + "/lectures",
                    "method": "GET",
                },
                "update": {
                    "href": request.url.path,
                    "method": "PUT",
                },
                "delete": {
                    "href": request.url.path,
                    "method": "DELETE",
                },
            }
        }
    }


@app.get("/api/academia/teachers/{teacher_id}/lectures", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            }
        }
    )
)
def read_teacher_lectures(
        teacher_id: int,
        request: Request,
        authorization: Annotated[str, Header()],
        page: int = 1,
        items_per_page: int = 10,
):
    role, user_id = ValidateIdentity(authorization)
    if (role not in ["profesor"]) or (teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lectures_res = Lecture.select().where(Lecture.id_titular == teacher.id)

    total_items = teacher_lectures_res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page
    total_pages = math.ceil(total_items / items_per_page)

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    teacher_lectures_res = teacher_lectures_res.limit(items_per_page).offset(start_index)

    teacher_lectures = []
    for lecture in teacher_lectures_res:
        lecture_dict = model_to_dict(lecture)
        teacher_lectures.append(lecture_dict)

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        }
    }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {
            "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["last_page"] = {
            "href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
            "method": "GET"
        }

    lectures = {
        "lectures": teacher_lectures,
        "_links": links
    }

    for lecture in teacher_lectures:
        lecture["_links"] = {
            "self": {
                "href": request.url.path + f"/{lecture['cod']}",
                "method": "GET",
            },
            "parent": {
                "href": request.url.path,
                "method": "GET",
            },
            "update": {
                "href": request.url.path,
                "method": "PUT",
            },
            "students": {
                "href": f"/api/academia/students?lecture_code={lecture['cod']}",
                "method": "GET",
            },
        }

    return {
        "lectures": lectures
    }


@app.get("/api/academia/teachers/{teacher_id}/lectures/{lecture_code}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_teacher_lecture(
        teacher_id: int,
        lecture_code: str,
        request: Request,
        authorization: Annotated[str, Header()],
):

    role, user_id = ValidateIdentity(authorization)
    if (role not in ["profesor"]) or (teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code.strip()))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://lectures_web_service:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        return {
            "lecture": {**model_to_dict(teacher_lecture)},
            "materials": data,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                },
                "update": {
                    "href": request.url.path,
                    "method": "PUT",
                },
                "create": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "POST",
                },
                "students": {
                    "href": f"/api/academia/students?lecture_code={lecture_code}",
                    "method": "GET",
                },

            }
        }

    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to get materials for the lecture!")


@app.put("/api/academia/teachers/{teacher_id}/lectures/{lecture_code}", status_code=204, responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def update_lecture_materials(
        teacher_id: int,
        lecture_code: str,
        authorization: Annotated[str, Header()],
        materials: dict = Body(...),
):
    role, user_id = ValidateIdentity(authorization)
    if role == "student" or (role == "profesor" and teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to update this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code.strip()))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://lectures_web_service:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
    headers = {"Content-Type": 'application/json', "Authorization": authorization}
    response = requests.put(url, json=materials, headers=headers)

    if response.status_code == 204:
        return {}
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to update the materials for the lecture!")


@app.post("/api/academia/teachers/{teacher_id}/lectures/{lecture_code}", status_code=201, responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
            409: {"description": "Conflict"}
        }
    )
)
def add_lecture_materials(
        teacher_id: int,
        lecture_code: str,
        authorization: Annotated[str, Header()],
        materials: dict = Body(...),
):
    role, user_id = ValidateIdentity(authorization)
    if role == "student" or (role == "profesor" and teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to post this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code.strip()))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or Teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://lectures_web_service:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
    headers = {"Content-Type": 'application/json', "Authorization": authorization}
    response = requests.post(url, json=materials, headers=headers)

    if response.status_code == 201:
        return response.json()
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to add the materials for the lecture!")


@app.post("/api/academia/teachers/", status_code=201, responses=(
        {
            **default_responses,
        }
    )
)
def add_teacher(
        response: Response,
        authorization: Annotated[str, Header()],
        firstName: str = Body(...),
        lastName: str = Body(...),
        email: str = Body(...),
        teachingDegree: TeacherDegree = Body(...),
        associationType: TeacherAssociation = Body(...),
        affiliation: str = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="You aren't authorized to post this resource")

    try:

        if not match(email_regex, email):
            response.status_code = 422
            return {"error": "Invalid email"}

        resource = {
            "nume": firstName.strip(),
            "prenume": lastName.strip(),
            "email": email.strip(),
            "grad_didactic": teachingDegree.value.strip(),
            "tip_asociere": associationType.value.strip(),
            "afiliere": affiliation.strip()
        }

        res = Teacher.insert(resource).execute()
        return {"id": res, **resource}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting teacher: {e}")


@app.put("/api/academia/teachers/{teacher_id}", status_code=204, responses=(
        {
            **default_responses,
            201: {"description": "Created"},
        }
    )
)
def update_teacher(
        teacher_id: int,
        response: Response,
        authorization: Annotated[str, Header()],
        firstName: str = Body(...),
        lastName: str = Body(...),
        email: str = Body(...),
        teachingDegree: TeacherDegree = Body(...),
        associationType: TeacherAssociation = Body(...),
        affiliation: str = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if role == "student" or (role == "profesor" and teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to update this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    if not match(email_regex, email):
        response.status_code = 422
        return {"error": "Invalid email"}

    if not Teacher.get_or_none(Teacher.id == teacher_id):
        response.status_code = 201
        resource = {
            "nume": lastName.strip(),
            "prenume": firstName.strip(),
            "email": email.strip(),
            "grad_didactic": teachingDegree.value.strip(),
            "tip_asociere": associationType.value.strip(),
            "afiliere": affiliation.strip()
        }
        res = Teacher.insert(resource).execute()
        return {"id": res, **resource}
    else:
        response.status_code = 204
        res = Teacher.update({
            "nume": lastName.strip(),
            "prenume": firstName.strip(),
            "email": email.strip(),
            "grad_didactic": teachingDegree.value.strip(),
            "tip_asociere": associationType.value.strip(),
            "afiliere": affiliation.strip()
        }).where(Teacher.id == teacher_id).execute()

        if response.status_code == 201 and res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the teacher: {teacher_id}")

        return {}


@app.delete("/api/academia/teachers/{teacher_id}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def delete_teacher(
        teacher_id: int,
        authorization: Annotated[str, Header()],
):
    role, user_id = ValidateIdentity(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="You aren't authorized to delete this resource")

    if teacher_id < 1:
        raise HTTPException(status_code=422, detail="Teacher ID must be a positive integer.")

    res = Teacher.select().where(Teacher.id == teacher_id)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Professor with the id: {teacher_id} not found")

    copy = res.first()

    delete_res = Teacher.delete().where(Teacher.id == teacher_id).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the professor: {teacher_id}")

    return {
        "status": "success",
        "teacher": {**model_to_dict(copy)}
    }
# STUDENTS


@app.get("/api/academia/students", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            },
        }
    )
)
def read_students(
        request: Request,
        authorization: Annotated[str, Header()],
        name: Union[str, None] = None,
        surname: Union[str, None] = None,
        degree: Union[str, None] = None,
        year: Union[int, None] = None,
        email: Union[str, None] = None,
        group: Union[int, None] = None,
        lecture_code: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):

    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"] and lecture_code is None:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if year is not None and year < 1:
        raise HTTPException(status_code=422, detail="Year must be a positive integer.")

    if group is not None and group < 1:
        raise HTTPException(status_code=422, detail="Group must be a positive integer.")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    filters = []
    if name:
        filters.append(Student.prenume.contains(name.strip()))
    if surname:
        filters.append(Student.nume.contains(surname.strip()))
    if email:
        filters.append(Student.email.contains(email.strip()))
    if degree:
        filters.append(Student.ciclu_studii.contains(degree.strip()))
    if year:
        filters.append(Student.an_studiu == year)
    if group:
        filters.append(Student.grupa == group)

    if lecture_code:
        if lecture_code is not None and role not in ["profesor", "admin"]:
            raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

        student_lectures_res = Student_Disciplina.select().where(Student_Disciplina.DisciplinaID == lecture_code)

        if student_lectures_res.count() == 0:
            raise HTTPException(status_code=404, detail="No students found for this lecture")

        filters.append(Student.id.in_([student_lecture.StudentID for student_lecture in student_lectures_res]))

    if filters:
        res = Student.select().where(*filters).order_by(Student.prenume)
    else:
        res = Student.select().order_by(Student.prenume)

    if not res:
        raise HTTPException(status_code=404, detail="Students not found")

    total_items = res.count()
    total_pages = math.ceil(total_items / items_per_page)
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        },
        "create": {
            "href": request.url.path,
            "method": "POST",
        },
    }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {
            "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["last_page"] = {
            "href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
            "method": "GET"
        }

    students = []
    for student in res:
        student_dict = model_to_dict(student)
        student_dict["_links"] = {
            "self": {
                "href": f"{request.url.path}/{student_dict["id"]}",
                "method": "GET",
            },
            "parent": {
                "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
                "method": "GET",
            }
        }

        if role == "admin":
            student_dict["_links"]["update"] = {
                "href": f"{request.url.path}/{student_dict["id"]}",
                "method": "PUT",
            }
            student_dict["_links"]["delete"] = {
                "href": f"{request.url.path}/{student_dict["id"]}",
                "method": "DELETE",
            }

        students.append(student_dict)

    return {"students": students, "_links": links}


@app.get("/api/academia/students/{student_id}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_student(student_id: int, request: Request, authorization: Annotated[str, Header()]):

    role, user_id = ValidateIdentity(authorization)
    if (role not in ["admin"]) and (student_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if student_id < 1:
        raise HTTPException(status_code=422, detail="Student ID must be a positive integer.")

    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    return {
        "student": {
            **model_to_dict(student),
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                },
                "lectures": {
                    "href": request.url.path + "/lectures",
                    "method": "GET",
                },
                "update": {
                    "href": request.url.path,
                    "method": "PUT"
                },
                "delete": {
                    "href": request.url.path,
                    "method": "DELETE"
                },
            }
        }
    }


@app.get("/api/academia/students/{student_id}/lectures", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            },
        }
    )
)
def read_student_lectures(
        student_id: int,
        request: Request,
        authorization: Annotated[str, Header()],
        page: int = 1,
        items_per_page: int = 10,
):

    role, user_id = ValidateIdentity(authorization)
    if (role != "student") or (student_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if student_id < 1:
        raise HTTPException(status_code=422, detail="Student ID must be a positive integer.")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_lectures_res = Student_Disciplina.select().where(Student_Disciplina.StudentID == student.id)

    total_items = student_lectures_res.count()
    total_pages = math.ceil(total_items / items_per_page)
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    student_lectures_res = student_lectures_res.limit(items_per_page).offset(start_index)

    student_lectures = []
    for student_lecture in student_lectures_res:
        lecture = Lecture.select().where(Lecture.cod == student_lecture).get()
        lecture_dict = model_to_dict(lecture)
        student_lectures.append(lecture_dict)

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        }
    }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {
            "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["last_page"] = {
            "href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
            "method": "GET"
        }

    return {
        "lectures": {
            "lectures": [
                {
                    **lecture,
                    "_links": {
                        "self": {
                            "href": f"{request.url.path}/{lecture['cod']}",
                            "method": "GET",
                        }
                    }
                }
                for lecture in student_lectures
            ],
            "_links": links
        }
    }


@app.get("/api/academia/students/{student_id}/lectures/{lecture_code}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_student_lecture(
        student_id: int,
        lecture_code: str,
        request: Request,
        authorization: Annotated[str, Header()],
):

    role, user_id = ValidateIdentity(authorization)
    if (role != "student") or (student_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if student_id < 1:
        raise HTTPException(status_code=422, detail="Student ID must be a positive integer.")

    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_lecture_res = Student_Disciplina.select().where((Student_Disciplina.StudentID == student.id) & (Student_Disciplina.DisciplinaID == lecture_code))

    if student_lecture_res.count() != 1:
        raise HTTPException(status_code=404, detail=f"Student not assigned to the lecture!")

    student_lecture = Lecture.select().where(Lecture.cod == lecture_code.strip()).get()

    if not student_lecture:
        raise HTTPException(status_code=404, detail=f"Lecture not found!")

    url = f"http://lectures_web_service:8004/api/academia/materials/{student_lecture.nume_disciplina}"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        return {
            "lecture": {**model_to_dict(student_lecture)},
            "materials": data,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                }
            }
        }

    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to get materials for the lecture!")


@app.post("/api/academia/students/", status_code=201, responses=(
        {
            **default_responses,
        }
    )
)
def add_student(
        response: Response,
        authorization: Annotated[str, Header()],
        first_name: str = Body(...),
        last_name: str = Body(...),
        email: str = Body(...),
        study_cycle: StudentCycle = Body(...),
        study_year: int = Body(...),
        group: int = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="You aren't authorized to post this resource")

    if study_year is not None and study_year < 1:
        raise HTTPException(status_code=422, detail="Study Year must be a positive integer.")

    if group is not None and group < 1:
        raise HTTPException(status_code=422, detail="Group must be a positive integer.")

    try:

        if not match(email_regex, email):
            response.status_code = 422
            return {"error": "Invalid email"}

        resource = {
            "nume": last_name.strip(),
            "prenume": first_name.strip(),
            "email": email.strip(),
            "ciclu_studii": study_cycle.value.strip(),
            "an_studiu": study_year,
            "grupa": group
        }

        res = Student.insert(resource).execute()
        return {"id": res, **resource}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting student: {e}")


@app.put("/api/academia/students/{student_id}", status_code=204, responses=(
        {
            **default_responses,
            201: {"description": "Created"},
        }
    )
)
def update_student(
        student_id: int,
        response: Response,
        authorization: Annotated[str, Header()],
        first_name: str = Body(...),
        last_name: str = Body(...),
        email: str = Body(...),
        study_cycle: StudentCycle = Body(...),
        study_year: int = Body(...),
        group: int = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if (role != "admin") and (student_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to update this resource")

    if student_id < 1:
        raise HTTPException(status_code=422, detail="Student ID must be a positive integer.")

    if not match(email_regex, email):
        response.status_code = 422
        return {"error": "Invalid email"}

    if study_year is not None and study_year < 1:
        raise HTTPException(status_code=422, detail="Study Year must be a positive integer.")

    if group is not None and group < 1:
        raise HTTPException(status_code=422, detail="Group must be a positive integer.")

    if not Student.get(Student.id == student_id):
        response.status_code = 201
        resource = {
            "nume": last_name.strip(),
            "prenume": first_name.strip(),
            "email": email.strip(),
            "ciclu_studii": study_cycle.value.strip(),
            "an_studiu": study_year,
            "grupa": group
        }
        res = Student.insert(resource).execute()
        return {"id": res, **resource}
    else:
        response.status_code = 204
        res = Student.update({
            "nume": last_name.strip(),
            "prenume": first_name.strip(),
            "email": email.strip(),
            "ciclu_studii": study_cycle.value.strip(),
            "an_studiu": study_year,
            "grupa": group
        }).where(Student.id == student_id).execute()

        if response.status_code == 201 and res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the student: {student_id}")

        return {}


@app.delete("/api/academia/students/{student_id}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def delete_student(
        authorization: Annotated[str, Header()],
        student_id: int,
):
    role, user_id = ValidateIdentity(authorization)
    if role != "admin":
        raise HTTPException(status_code=403, detail="You aren't authorized to delete this resource")

    if student_id < 1:
        raise HTTPException(status_code=422, detail="Student ID must be a positive integer.")

    res = Student.select().where(Student.id == student_id)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Student with the id: {student_id} not found")

    copy = res.first()

    delete_res = Student.delete().where(Student.id == student_id).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the student: {student_id}")

    return {
        "status": "success",
        "student": {**model_to_dict(copy)}
    }
# LECTURES


@app.get("/api/academia/lectures", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
            416: {
                "description": "Range Not Satisfiable",
                "content": {
                    "application/json": {
                        "example": {"detail": {"max_page": 1, "items_per_page": 5}}
                    }
                }
            },
        }
    )
)
def read_lectures(
        request: Request,
        authorization: Annotated[str, Header()],
        coordinator: Union[str, None] = None,
        name: Union[str, None] = None,
        year: Union[int, None] = None,
        type: Union[str, None] = None,
        category: Union[str, None] = None,
        examination: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):

    role, user_id = ValidateIdentity(authorization)
    if role not in ["profesor"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if year is not None and year and year < 1:
        raise HTTPException(status_code=422, detail="Year must be a positive integer")

    if page < 1:
        raise HTTPException(status_code=422, detail="Page number must be positive!")
    if items_per_page < 1 or items_per_page > MAX_ITEMS_PER_PAGE:
        raise HTTPException(status_code=422, detail="Items per page must be positive and smaller than 100!")

    filters = []
    if coordinator:
        coordinator_id = Teacher.select().where(Teacher.nume.contains(coordinator.strip())).get().id
        filters.append(Lecture.id_titular == coordinator_id)
    if name:
        filters.append(Lecture.nume_disciplina.contains(name.strip()))
    if year:
        filters.append(Lecture.an_studiu == year)
    if type:
        filters.append(Lecture.tip_disciplina.contains(type.strip()))
    if category:
        filters.append(Lecture.categorie_disciplina.contains(category.strip()))
    if examination:
        filters.append(Lecture.tip_examinare.contains(examination.strip()))

    if filters:
        res = Lecture.select().where(*filters).order_by(Lecture.cod)
    else:
        res = Lecture.select().order_by(Lecture.cod)

    if not res:
        raise HTTPException(status_code=404, detail="lecture not found")

    total_items = res.count()
    total_pages = math.ceil(total_items / items_per_page)
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": total_pages,
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    lectures = []
    for lecture in res:
        lecture_dict = model_to_dict(lecture)
        lecture_dict["_links"] = {
            "self": {
                "href": f"{request.url.path}/{lecture_dict["cod"]}",
                "method": "GET",
            },
            "parent": {
                "href": request.url.path,
                "method": "GET",
            },
        }

        if int(lecture_dict["id_titular"]) == int(user_id):
            lecture_dict["_links"]["update"] = {
                "href": f"{request.url.path}/{lecture_dict["cod"]}",
                "method": "PUT",
            }

        if role == "admin":
            lecture_dict["_links"]["delete"] = {
                "href": f"{request.url.path}/{lecture_dict["cod"]}",
                "method": "DELETE",
            }

        lectures.append(lecture_dict)

    links = {
        "self": {
            "href": request.url.path,
            "method": "GET",
        },
        "parent": {
            "href": '/'.join(request.url.path.split('/')[:-1]),
            "method": "GET",
        },
        "teacher_lectures": {
            "href": f"http://localhost:8000/api/academia/teachers/{user_id}/lectures",
            "method": "POST",
        },
    }

    if role == "admin":
        links["create"] = {
            "create": {
                "href": request.url.path,
                "method": "POST",
            },
        }

    if page > 1:
        links["first_page"] = {
            "href": f"{request.url.path}?page=1&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["previous_page"] = {
            "href": f"{request.url.path}?page={page - 1}&items_per_page={items_per_page}",
            "method": "GET"
        }

    if page < total_pages:
        links["next_page"] = {
            "href": f"{request.url.path}?page={page + 1}&items_per_page={items_per_page}",
            "method": "GET"
        }
        links["last_page"] = {
            "href": f"{request.url.path}?page={total_pages}&items_per_page={items_per_page}",
            "method": "GET"
        }

    return {"lectures":
        {
            "lectures": lectures,
            "_links": links
        }
    }


@app.get("/api/academia/lectures/{lecture_code}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_lecture(lecture_code: str, request: Request, authorization: Annotated[str, Header()]):

    role, user_id = ValidateIdentity(authorization)
    if role not in ["profesor"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    try:
        lecture = Lecture.select().where(Lecture.cod == lecture_code.strip()).get()
    except:
        raise HTTPException(status_code=404, detail="Lecture not found")

    url = f"http://lectures_web_service:8004/api/academia/materials/{lecture.nume_disciplina}"
    headers = {"Authorization": authorization}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()

        lecture = {
            "lecture": {
                **model_to_dict(lecture),
            },
            "materials": data,
            "_links": {
                "self": {
                    "href": request.url.path,
                    "method": "GET",
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1]),
                    "method": "GET",
                },
            }
        }
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to get materials for the lecture!")

    if int(lecture["lecture"]["id_titular"]) == int(user_id):
        lecture["_links"]["update"] = {
            "href": request.url.path,
            "method": "PUT",
        }
        lecture["_links"]["students"] = {
            "href": f"/api/academia/students?lecture_code={lecture_code}",
            "method": "GET",
        }

    return lecture


@app.post("/api/academia/lectures/", status_code=201, responses=(
        {
            **default_responses,
        }
    )
)
def add_lecture(
        authorization: Annotated[str, Header()],
        code: str = Body(...),
        coordinator_id: int = Body(...),
        lecture_name: str = Body(...),
        year: int = Body(...),
        lecture_type: LectureType = Body(...),
        category: LectureCategory = Body(...),
        examination: LectureExamination = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to post this resource")

    if coordinator_id < 1:
        raise HTTPException(status_code=422, detail="Coordinator ID must be a positive integer.")

    if year is not None and year < 1:
        raise HTTPException(status_code=422, detail="Year must be a positive integer.")

    try:
        resource = {
            "cod": code.strip(),
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name.strip(),
            "an_studiu": year,
            "tip_disciplina": lecture_type.value.strip(),
            "categorie_disciplina": category.value.strip(),
            "tip_examinare": examination.value.strip()
        }

        res = Lecture.insert(resource).execute()
        return {"id": res, **resource}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting lecture: {e}")


@app.put("/api/academia/lectures/{lecture_code}", status_code=204, responses=(
        {
            **default_responses,
            201: {"description": "Created"},
        }
    )
)
def update_lecture(
        lecture_code: str,
        response: Response,
        authorization: Annotated[str, Header()],
        coordinator_id: int = Body(...),
        lecture_name: str = Body(...),
        year: int = Body(...),
        lecture_type: LectureType = Body(...),
        category: LectureCategory = Body(...),
        examination: LectureExamination = Body(...)
):
    role, user_id = ValidateIdentity(authorization)
    if role != "admin" and (role == "profesor" and user_id != coordinator_id):
        raise HTTPException(status_code=403, detail="You aren't authorized to update this resource")

    if coordinator_id < 1:
        raise HTTPException(status_code=422, detail="Coordinator ID must be a positive integer.")

    if year is not None and year < 1:
        raise HTTPException(status_code=422, detail="Year must be a positive integer.")

    if not Lecture.get_or_none(Lecture.cod == lecture_code):
        response.status_code = 201
        resource = {
            "cod": lecture_code.strip(),
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name.strip(),
            "an_studiu": year,
            "tip_disciplina": lecture_type.value.strip(),
            "categorie_disciplina": category.value.strip(),
            "tip_examinare": examination.value.strip()
        }
        res = Lecture.insert(resource).execute()
        return {"id": res, **resource}
    else:
        response.status_code = 204
        res = Lecture.update({
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name.strip(),
            "an_studiu": year,
            "tip_disciplina": lecture_type.value.strip(),
            "categorie_disciplina": category.value.strip(),
            "tip_examinare": examination.value.strip()
        }).where(Lecture.cod == lecture_code).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the lecture: {lecture_code}")

        return {}


@app.delete("/api/academia/lectures/{lecture_code}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def delete_lecture(
        authorization: Annotated[str, Header()],
        lecture_code: str,
):
    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to delete this resource")

    res = Lecture.select().where(Lecture.cod == lecture_code.strip())

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Lecture with the code: {lecture_code.strip()} not found")

    copy = res.first()

    delete_res = Lecture.delete().where(Lecture.cod == lecture_code.strip()).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the lecture: {lecture_code.strip()}")

    return {
        "status": "success",
        "lecture": {**model_to_dict(copy)}
    }


@app.get("/api/academia/lectures/authorization/{lecture_name}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def validate_materials_access(lecture_name: str, method: str, request: Request, authorization: Annotated[str, Header()]):
    status = "unauthorized"
    role, user_id = ValidateIdentity(authorization)

    if role == "profesor":
        try:
            lecture = Lecture.select().where(Lecture.nume_disciplina == lecture_name.strip()).get()
            if method.strip() == "GET":
                status = "authorized"
                if lecture and int(lecture.id_titular) == int(user_id):
                    status = "owner"
            elif method.strip() in ["POST", "PUT", "DELETE"]:
                if lecture and int(lecture.id_titular) == int(user_id):
                    status = "owner"
        except:
            raise HTTPException(status_code=404, detail="Lecture not found")
    elif role == "student":
        if method.strip() != "GET":
            raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")
        try:
            student = Student.select().where(Student.id == user_id).get()
            lecture = Lecture.select().where(Lecture.nume_disciplina == lecture_name.strip()).get()
        except:
            raise HTTPException(status_code=404, detail="Student/Lecture not found")

        student_lecture_res = Student_Disciplina.select().where(
            (Student_Disciplina.StudentID == student.id) & (Student_Disciplina.DisciplinaID == lecture.cod))

        if student_lecture_res.count() != 1:
            raise HTTPException(status_code=403, detail=f"Student not assigned to the lecture!")
        else:
            status = "authorized"
    else:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    return {
        "status": status,
        "_links": {
            "self": {
                "href": request.url.path,
                "method": "GET",
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1]),
                "method": "GET",
            },
        }
    }