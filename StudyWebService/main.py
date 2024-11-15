from typing import Union
from peewee import MySQLDatabase
from peewee import Model, CharField, IntegerField, ForeignKeyField, CompositeKey
from playhouse.shortcuts import model_to_dict

from fastapi import FastAPI, HTTPException, Request

import json

db = MySQLDatabase(database='pos', user='posadmin', passwd='passwdpos', host='localhost', port=3306)

app = FastAPI()

db.connect()

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

class Disciplina(BaseModel):
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

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/api/teachers")
def read_teachers(request: Request, name: Union[str, None] = None, teachingDegree: Union[str, None] = None, associationType: Union[str, None] = None, affiliation: Union[str, None] = None, email: Union[str, None] = None, surname: Union[str, None] = None):
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

    teachers = []
    for teacher in res:
        teacher_dict = model_to_dict(teacher)
        teacher_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        teachers.append(teacher_dict)

    return {"teachers": teachers}


@app.get("/api/teachers/{teacher_id}")
def read_item(teacher_id: int, request: Request, q: Union[str, None] = None):
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
                },
                "parent": {
                    "href": '/'.join(request.url.path.split('/')[:-1])
                },
                "courses": {
                    "href": request.url.path + "/courses"
                },
            }
        }
    }


@app.get("/api/teachers/{teacher_id}/courses")
def read_item(teacher_id: int, request: Request, q: Union[str, None] = None):
    try:
        teacher = Teacher.select().where(Teacher.id == teacher_id).get()
    except:
        raise HTTPException(status_code=404, detail="Teacher not found")

    teacher_courses_res = Disciplina.select().where(Disciplina.id_titular == teacher.id)

    teacher_courses = []
    for course in teacher_courses_res:
        course_dict = model_to_dict(course)
        teacher_courses.append(course_dict)

    return {
        "teacher-courses": {
            "courses": teacher_courses,
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


app.post("/api/teachers/add")
def add_teacher(firstName: str, lastName: str, email: str, teachingDegree: str, associationType: str, affiliation: str):
    try:
        res = Teacher.insert({
            "nume": firstName,
            "prenume": lastName,
            "email": email,
            "grad_didactic": teachingDegree,
            "tip_asociere": associationType,
            "afiliation": affiliation
        }).execute()
        return {"status": "success", "data": {"teacher_id": res}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inserting teacher: {e}")


@app.get("/api/students")
def read_students(request: Request, name: Union[str, None] = None, surname: Union[str, None] = None, degree: Union[str, None] = None, year: Union[str, None] = None, email: Union[str, None] = None, group: Union[str, None] = None):
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


@app.get("/api/students/{student_id}")
def read_item(student_id: int, request: Request):
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
                "courses": {
                    "href": request.url.path + "/courses"
                }
            }
        }
    }


@app.get("/api/students/{student_id}/courses")
def read_item(student_id: int, request: Request):
    try:
        student = Student.select().where(Student.id == student_id).get()
    except:
        raise HTTPException(status_code=404, detail="Student not found")

    student_courses_res = Student_Disciplina.select().where(Student_Disciplina.StudentID == student.id)

    student_courses = []
    for student_course in student_courses_res:
        course = Disciplina.select().where(Disciplina.cod == student_course).get()
        course_dict = model_to_dict(course)
        student_courses.append(course_dict)

    return {
        "student-courses": {
            "courses": student_courses,
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


@app.get("/api/courses")
def read_courses(request: Request, coordinator: Union[str, None] = None, name: Union[str, None] = None, year: Union[str, None] = None, type: Union[str, None] = None, category: Union[str, None] = None, examination: Union[str, None] = None):
    if coordinator:
        res = Disciplina.select().where(Disciplina.id_titular == (Teacher.select().where(Teacher.nume.contains(coordinator)).get())).order_by(Disciplina.cod)
    elif name:
        res = Disciplina.select().where(Disciplina.nume_disciplina.contains(name)).order_by(Disciplina.cod)
    elif year:
        res = Disciplina.select().where(Disciplina.an_studiu == year).order_by(Disciplina.cod)
    elif type:
        res = Disciplina.select().where(Disciplina.tip_disciplina.contains(type)).order_by(Disciplina.cod)
    elif category:
        res = Disciplina.select().where(Disciplina.categorie_disciplina.contains(category)).order_by(Disciplina.cod)
    elif examination:
        res = Disciplina.select().where(Disciplina.tip_examinare.contains(examination)).order_by(Disciplina.cod)
    else:
        res = Disciplina.select()

    if not res:
        raise HTTPException(status_code=404, detail="Course not found")

    courses = []
    for course in res:
        course_dict = model_to_dict(course)
        course_dict["_links"] = {
            "self": {
                "href": request.url.path,
            },
            "parent": {
                "href": '/'.join(request.url.path.split('/')[:-1])
            }
        }
        courses.append(course_dict)

    return {"courses": courses}