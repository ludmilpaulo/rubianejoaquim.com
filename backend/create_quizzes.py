#!/usr/bin/env python
"""
Script para criar quizzes automaticamente para todas as aulas
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from courses.models import Lesson, LessonQuiz, Question, LessonQuizQuestion, Course

def create_quizzes_for_all_lessons():
    """Cria quizzes para todas as aulas que não têm quiz"""
    lessons = Lesson.objects.all()
    questions = Question.objects.all()
    
    if not questions.exists():
        print("❌ Nenhuma pergunta encontrada no banco!")
        print("   Por favor, crie perguntas primeiro no admin.")
        return
    
    print(f"📚 Total de aulas: {lessons.count()}")
    print(f"❓ Total de perguntas disponíveis: {questions.count()}")
    print("\n" + "="*60)
    
    created_count = 0
    skipped_count = 0
    
    for lesson in lessons:
        # Verificar se já existe quiz ativo
        existing_quiz = LessonQuiz.objects.filter(lesson=lesson, is_active=True).first()
        
        if existing_quiz:
            print(f"⏭️  Aula '{lesson.title}' já tem quiz (ID: {existing_quiz.id})")
            skipped_count += 1
            continue
        
        # Criar novo quiz
        quiz = LessonQuiz.objects.create(
            lesson=lesson,
            title=f"Quiz - {lesson.title}",
            description=f"Quiz da aula: {lesson.title}",
            passing_score=70,
            is_active=True
        )
        
        # Associar perguntas ao quiz (máximo 5 perguntas por quiz)
        questions_to_add = questions[:5]  # Pegar as primeiras 5 perguntas
        
        for idx, question in enumerate(questions_to_add):
            LessonQuizQuestion.objects.create(
                quiz=quiz,
                question=question,
                points=1,
                order=idx + 1
            )
        
        print(f"✅ Criado quiz para '{lesson.title}' (ID: {quiz.id}) com {questions_to_add.count()} perguntas")
        created_count += 1
    
    print("\n" + "="*60)
    print(f"✅ Resumo:")
    print(f"   • Quizzes criados: {created_count}")
    print(f"   • Quizzes já existentes (pulados): {skipped_count}")
    print(f"   • Total de aulas: {lessons.count()}")

if __name__ == '__main__':
    create_quizzes_for_all_lessons()
