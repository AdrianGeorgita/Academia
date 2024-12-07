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

import grpc, auth_pb2_grpc, auth_pb2

db = MySQLDatabase(database='pos', user='posadmin', passwd='passwdpos', host='localhost', port=3306)

app = FastAPI()

db.connect()

email_regex = "^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$"

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


def ValidateIdentity(token: str):
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header invalid or not present")
    else:
        jws = token.split("Bearer ")[1]

        with grpc.insecure_channel("localhost:50051") as channel:
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

    if name:
        res = Teacher.select().where(Teacher.nume.contains(name)).order_by(Teacher.prenume)
    elif surname:
        res = Teacher.select().where(Teacher.prenume.contains(surname)).order_by(Teacher.prenume)
    elif email:
        res = Teacher.select().where(Teacher.email.contains(email)).order_by(Teacher.prenume)
    elif teachingDegree:
        res = Teacher.select().where(Teacher.grad_didactic.contains(teachingDegree)).order_by(Teacher.prenume)
    elif associationType:
        res = Teacher.select().where(Teacher.tip_asociere.contains(associationType)).order_by(Teacher.prenume)
    elif affiliation:
        res = Teacher.select().where(Teacher.afiliere.contains(affiliation)).order_by(Teacher.prenume)
    else:
        res = Teacher.select()

    total_teachers = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_teachers:
        raise HTTPException(status_code=416, detail={"max_page": math.ceil(total_teachers / items_per_page),
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    teachers = []
    for teacher in res:
        teacher_dict = model_to_dict(teacher)
        teacher_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            },
            "page": page,
            "items_per_page": items_per_page,
        }
        teachers.append(teacher_dict)

    return {"teachers": teachers}


@app.get("/api/academia/teachers/{teacher_id}", responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def read_teacher(teacher_id: int, request: Request, authorization: Annotated[str, Header()]):
    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    role, user_id = ValidateIdentity(authorization)
    if (role not in ["profesor"]) or (teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    return {
        "teacher": {
            **model_to_dict(teacher),
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
                "lectures": {
                    "href": request.url.path + "/lectures"
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

    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lectures_res = Lecture.select().where(Lecture.id_titular == teacher.id)

    total_items = teacher_lectures_res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": math.ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    teacher_lectures_res = teacher_lectures_res.limit(items_per_page).offset(start_index)

    teacher_lectures = []
    for lecture in teacher_lectures_res:
        lecture_dict = model_to_dict(lecture)
        teacher_lectures.append(lecture_dict)

    return {
        "teacher-lectures": {
            "lectures": teacher_lectures,
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
            }
        }
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

    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://127.0.0.1:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
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
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
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
        request: Request,
        authorization: Annotated[str, Header()],
        materials: dict = Body(...),
):
    role, user_id = ValidateIdentity(authorization)
    if role == "student" or (role == "profesor" and teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to update this resource")

    teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://127.0.0.1:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
    headers = {"Content-Type": 'application/json', "Authorization": authorization}
    response = requests.put(url, json=materials, headers=headers)

    if response.status_code == 204:
        return {
            "data": "Successfully updated the lecture materials!"
        }
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to update the materials for the lecture!")


@app.post("/api/academia/teachers/{teacher_id}/lectures/{lecture_code}", status_code=204, responses=(
        {
            **default_responses,
            404: {"description": "Not Found"},
        }
    )
)
def add_lecture_materials(
        teacher_id: int,
        lecture_code: str,
        request: Request,
        authorization: Annotated[str, Header()],
        materials: dict = Body(...),
):
    role, user_id = ValidateIdentity(authorization)
    if role == "student" or (role == "profesor" and teacher_id != int(user_id)):
        raise HTTPException(status_code=403, detail="You aren't authorized to post this resource")

    teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_lecture = Lecture.select().where((Lecture.id_titular == teacher.id) & (Lecture.cod == lecture_code))

    if teacher_lecture.count() != 1:
        raise HTTPException(status_code=404, detail=f"Lecture not Found or Teacher not assigned to the lecture!")

    teacher_lecture = teacher_lecture.get()

    url = f"http://127.0.0.1:8004/api/academia/materials/{teacher_lecture.nume_disciplina}"
    headers = {"Content-Type": 'application/json', "Authorization": authorization}
    response = requests.post(url, json=materials, headers=headers)

    if response.status_code == 204:
        return {
            "data": "Successfully added the lecture materials!"
        }
    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to add the materials for the lecture!")


@app.post("/api/academia/teachers/", status_code=204, responses=(
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

        res = Teacher.insert({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree.value,
            "tip_asociere": associationType.value,
            "afiliere": affiliation
        }).execute()
        return {"status": "success", "data": {"teacher_id": res}}
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

    if not match(email_regex, email):
        response.status_code = 422
        return {"error": "Invalid email"}

    if not Teacher.get_or_none(Teacher.id == teacher_id):
        response.status_code = 201
        res = Teacher.insert({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree.value,
            "tip_asociere": associationType.value,
            "afiliere": affiliation
        }).execute()
        return {"status": "success", "data": {"teacher_id": res}}
    else:
        response.status_code = 204
        res = Teacher.update({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree.value,
            "tip_asociere": associationType.value,
            "afiliere": affiliation
        }).where(Teacher.id == teacher_id).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the teacher: {teacher_id}")

        return {
            "status": "success",
        }


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
        year: Union[str, None] = None,
        email: Union[str, None] = None,
        group: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):

    role, user_id = ValidateIdentity(authorization)
    if role not in ["admin"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if name:
        res = Student.select().where(Student.prenume.contains(name)).order_by(Student.nume)
    elif surname:
        res = Student.select().where(Student.nume.contains(surname)).order_by(Student.prenume)
    elif email:
        res = Student.select().where(Student.email.contains(email)).order_by(Student.prenume)
    elif degree:
        res = Student.select().where(Student.ciclu_studii.contains(degree)).order_by(Student.prenume)
    elif year:
        res = Student.select().where(Student.an_studiu.contains(year)).order_by(Student.prenume)
    elif group:
        res = Student.select().where(Student.grupa.contains(group)).order_by(Student.prenume)
    else:
        res = Student.select()

    if not res:
        raise HTTPException(status_code=404, detail="Students not found")

    total_items = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": math.ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    students = []
    for student in res:
        student_dict = model_to_dict(student)
        student_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        students.append(student_dict)

    return {"students": students}


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
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
                "lectures": {
                    "href": request.url.path + "/lectures"
                }
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

    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_lectures_res = Student_Disciplina.select().where(Student_Disciplina.StudentID == student.id)

    total_items = student_lectures_res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": math.ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    student_lectures_res = student_lectures_res.limit(items_per_page).offset(start_index)

    student_lectures = []
    for student_lecture in student_lectures_res:
        lecture = Lecture.select().where(Lecture.cod == student_lecture).get()
        lecture_dict = model_to_dict(lecture)
        student_lectures.append(lecture_dict)

    return {
        "student-lectures": {
            "lectures": student_lectures,
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
            }
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

    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_lecture_res = Student_Disciplina.select().where((Student_Disciplina.StudentID == student.id) & (Student_Disciplina.DisciplinaID == lecture_code))

    if student_lecture_res.count() != 1:
        raise HTTPException(status_code=404, detail=f"Student not assigned to the lecture!")

    student_lecture = Lecture.select().where(Lecture.cod == lecture_code).get()

    if not student_lecture:
        raise HTTPException(status_code=404, detail=f"Lecture not found!")

    url = f"http://127.0.0.1:8004/api/academia/materials/{student_lecture.nume_disciplina}"
    headers = {"Authorization": authorization}
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        return {
            "lecture": {**model_to_dict(student_lecture)},
            "materials": data,
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                }
            }
        }

    else:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to get materials for the lecture!")


@app.post("/api/academia/students/", status_code=204, responses=(
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

    try:

        if not match(email_regex, email):
            response.status_code = 422
            return {"error": "Invalid email"}

        res = Student.insert({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle.value,
            "an_studiu": study_year,
            "grupa": group
        }).execute()
        return {"status": "success", "data": {"student_id": res}}
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

    if not match(email_regex, email):
        response.status_code = 422
        return {"error": "Invalid email"}

    if not Student.get(Student.id == student_id):
        response.status_code = 201
        res = Student.insert({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle.value,
            "an_studiu": study_year,
            "grupa": group
        }).execute()
        return {"status": "success", "data": {"student_id": res}}
    else:
        response.status_code = 204
        res = Student.update({
            "nume": last_name,
            "prenume": first_name,
            "email": email,
            "ciclu_studii": study_cycle.value,
            "an_studiu": study_year,
            "grupa": group
        }).where(Student.id == student_id).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the student: {student_id}")

        return {
            "status": "success",
        }


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
        year: Union[str, None] = None,
        type: Union[str, None] = None,
        category: Union[str, None] = None,
        examination: Union[str, None] = None,
        page: int = 1,
        items_per_page: int = 10,
):

    role, user_id = ValidateIdentity(authorization)
    if role not in ["profesor"]:
        raise HTTPException(status_code=403, detail="You aren't authorized to access this resource")

    if coordinator:
        res = Lecture.select().where(Lecture.id_titular == (Teacher.select().where(Teacher.nume.contains(coordinator)).get())).order_by(Lecture.cod)
    elif name:
        res = Lecture.select().where(Lecture.nume_disciplina.contains(name)).order_by(Lecture.cod)
    elif year:
        res = Lecture.select().where(Lecture.an_studiu == year).order_by(Lecture.cod)
    elif type:
        res = Lecture.select().where(Lecture.tip_disciplina.contains(type)).order_by(Lecture.cod)
    elif category:
        res = Lecture.select().where(Lecture.categorie_disciplina.contains(category)).order_by(Lecture.cod)
    elif examination:
        res = Lecture.select().where(Lecture.tip_examinare.contains(examination)).order_by(Lecture.cod)
    else:
        res = Lecture.select()

    if not res:
        raise HTTPException(status_code=404, detail="lecture not found")

    total_items = res.count()
    start_index = (page - 1) * items_per_page
    end_index = start_index + items_per_page

    if start_index >= total_items:
        raise HTTPException(status_code=416, detail={"max_page": math.ceil(total_items / items_per_page),
                                                      "items_per_page": items_per_page})

    res = res.limit(items_per_page).offset(start_index)

    lectures = []
    for lecture in res:
        lecture_dict = model_to_dict(lecture)
        lecture_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        lectures.append(lecture_dict)

    return {"lectures": lectures}


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
        lecture = Lecture.select().where(Lecture.cod == lecture_code).get()
    except:
        raise HTTPException(status_code=404, detail="Lecture not found")

    return {
        "lecture": {
            **model_to_dict(lecture),
            "_links": {
                "self": {
                    "href": request.url.path,
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
            }
        }
    }


@app.post("/api/academia/lectures/", status_code=204, responses=(
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

    try:
        res = Lecture.insert({
            "cod": code,
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type.value,
            "categorie_disciplina": category.value,
            "tip_examinare": examination.value
        }).execute()
        return {"status": "success", "data": {"lecture_id": res}}
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

    if not Lecture.get_or_none(Lecture.cod == lecture_code):
        response.status_code = 201
        res = Lecture.insert({
            "cod": lecture_code,
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type.value,
            "categorie_disciplina": category.value,
            "tip_examinare": examination.value
        }).execute()
        return {"status": "success", "data": {"lecture_id": res}}
    else:
        response.status_code = 204
        res = Lecture.update({
            "id_titular": coordinator_id,
            "nume_disciplina": lecture_name,
            "an_studiu": year,
            "tip_disciplina": lecture_type.value,
            "categorie_disciplina": category.value,
            "tip_examinare": examination.value
        }).where(Lecture.cod == lecture_code).execute()

        if res != 1:
            raise HTTPException(status_code=500, detail=f"Failed to update the lecture: {lecture_code}")

        return {
            "status": "success",
        }


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

    res = Lecture.select().where(Lecture.cod == lecture_code)

    if res.count() < 1:
        raise HTTPException(status_code=404, detail=f"Lecture with the code: {lecture_code} not found")

    copy = res.first()

    delete_res = Lecture.delete().where(Lecture.cod == lecture_code).execute()

    if delete_res != 1:
        raise HTTPException(status_code=500, detail=f"Failed to delete the lecture: {lecture_code}")

    return {
        "status": "success",
        "lecture": {**model_to_dict(copy)}
    }

