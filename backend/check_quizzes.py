#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from courses.models import LessonQuiz, Lesson

print('=== QUIZZES NO BANCO ===')
quizzes = LessonQuiz.objects.all()
if quizzes.exists():
    for q in quizzes:
        print(f'Quiz ID: {q.id}, Lesson ID: {q.lesson.id} ({q.lesson.title}), Active: {q.is_active}, Questions: {q.questions.count()}')
else:
    print('Nenhum quiz encontrado no banco!')

print('\n=== LESSONS E SEUS QUIZZES ===')
lessons = Lesson.objects.all()
for l in lessons:
    has_quiz = LessonQuiz.objects.filter(lesson=l, is_active=True).exists()
    quiz_count = LessonQuiz.objects.filter(lesson=l).count()
    print(f'Lesson ID: {l.id} ({l.title[:50]}), Has Active Quiz: {has_quiz}, Total Quizzes: {quiz_count}')
    if quiz_count > 0:
        for q in LessonQuiz.objects.filter(lesson=l):
            print(f'  - Quiz ID: {q.id}, Active: {q.is_active}, Questions: {q.questions.count()}')
