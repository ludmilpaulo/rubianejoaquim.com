"""
Email templates and utilities for sending emails
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_enrollment_approval_email(enrollment):
    """
    Envia email de aprovação de inscrição no curso
    """
    user = enrollment.user
    course = enrollment.course
    
    # Contexto para o template
    context = {
        'user_name': user.get_full_name() or user.first_name or user.email.split('@')[0],
        'course_title': course.title,
        'course_description': course.short_description or course.description[:200] + '...' if len(course.description) > 200 else course.description,
        'area_do_aluno_url': f"{settings.FRONTEND_URL}/area-do-aluno",
        'mobile_app_info': 'Você também pode acessar todo o conteúdo através do nosso aplicativo móvel Zenda, disponível para iOS e Android.',
    }
    
    # Renderizar template HTML
    html_content = render_to_string('emails/enrollment_approved.html', context)
    text_content = strip_tags(html_content)
    
    # Criar email
    subject = f'🎉 Bem-vindo(a) ao curso {course.title}!'
    
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    
    email.attach_alternative(html_content, "text/html")
    
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False
