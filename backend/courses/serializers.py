from rest_framework import serializers
from .models import Course, Lesson, LessonAttachment, Enrollment, PaymentProof, Progress


class LessonAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonAttachment
        fields = ['id', 'title', 'file', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    attachments = LessonAttachmentSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'slug', 'description', 'video_url', 'duration',
            'content', 'is_free', 'order', 'attachments', 'progress', 'created_at'
        ]

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = Progress.objects.get(user=request.user, lesson=obj)
                return {
                    'completed': progress.completed,
                    'completed_at': progress.completed_at
                }
            except Progress.DoesNotExist:
                return {'completed': False, 'completed_at': None}
        return None


class CourseSerializer(serializers.ModelSerializer):
    lessons_count = serializers.SerializerMethodField()
    free_lessons_count = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'price', 'image', 'is_active', 'lessons_count', 'free_lessons_count',
            'enrollment_status', 'created_at'
        ]

    def get_lessons_count(self, obj):
        return obj.lessons.count()

    def get_free_lessons_count(self, obj):
        return obj.lessons.filter(is_free=True).count()

    def get_enrollment_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                enrollment = Enrollment.objects.get(user=request.user, course=obj)
                return {
                    'status': enrollment.status,
                    'enrolled_at': enrollment.enrolled_at,
                    'activated_at': enrollment.activated_at
                }
            except Enrollment.DoesNotExist:
                return None
        return None


class CourseDetailSerializer(CourseSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['lessons']


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    payment_proof = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'status', 'enrolled_at', 'activated_at', 'payment_proof']

    def get_payment_proof(self, obj):
        try:
            proof = obj.payment_proof
            return {
                'id': proof.id,
                'status': proof.status,
                'created_at': proof.created_at,
                'reviewed_at': proof.reviewed_at
            }
        except PaymentProof.DoesNotExist:
            return None


class PaymentProofSerializer(serializers.ModelSerializer):
    enrollment = EnrollmentSerializer(read_only=True)

    class Meta:
        model = PaymentProof
        fields = ['id', 'enrollment', 'file', 'notes', 'status', 'created_at', 'reviewed_at']
        read_only_fields = ['status', 'reviewed_at']


class ProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)

    class Meta:
        model = Progress
        fields = ['id', 'lesson', 'completed', 'completed_at', 'updated_at']
