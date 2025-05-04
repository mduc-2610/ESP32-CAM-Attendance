import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User, UserTag
from camera.models import FaceImage, CameraConfiguration
from attendance.models import Attendance, AttendanceSession
from faker import Faker
import random
import json
import unidecode

def generate_email(ten, ma):
        parts = ten.strip().split()
        if len(parts) >= 2:
            last_name = unidecode.unidecode(parts[-1])  # Last name
            initials = ''.join([unidecode.unidecode(p[0]).upper() for p in parts[:-1]])  # Initials of other names
            email_prefix = f"{last_name}{initials}"
        else:
            email_prefix = unidecode.unidecode(ten.replace(" ", ""))
        
        # Example: B21DCCN224 -> B21CN224 (keep B21 + last 5 chars)
        ma_suffix = ma[:3] + ma[-5:]
        return f"{email_prefix}.{ma_suffix}@stu.ptit.edu.vn"


def load_cnpm4_data():
    
    with open('users/management/commands/cnpm4.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    user_list = []
    for record in data:
        ten = record["sinhVien"]["ten"]
        ma = record["sinhVien"]["ma"]
        email = generate_email(ten, ma)
        user_list.append({
            "name": ten,
            "email": email,
            "password": email  # or use a fixed password like "123456" if preferred
        })

    # Print or use user_list
    for user in user_list:
        print(user)

    tag = UserTag.objects.create(name="CNPM4")
    for user in user_list:
        try:
            user_obj = User.objects.create_user(
                name=user["name"],
                email=user["email"],
                password=user["password"]
            )
            user_obj.tags.add(tag)
            user_obj.save()
            print(f"Created user: {user['name']} - {user['email']}")
        except Exception as e:
            print(f"Error creating user: {str(e)}")

class Command(BaseCommand):
    help = 'Generate fake users for testing'
    
    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of fake users to generate')
        parser.add_argument('--tags', type=str, default='IT101,AI202,CS305', help='Comma-separated list of tags')
        parser.add_argument('--delete', type=int, default=1, help='Delete all existing users before generating new ones')

    def handle(self, *args, **options):
        if options['delete'] >= 1:
            User.objects.all().delete()
            UserTag.objects.all().delete()
            FaceImage.objects.all().delete()
            # CameraConfiguration.objects.all().delete()
            Attendance.objects.all().delete()
            AttendanceSession.objects.all().delete()

        count = options['count']
        tag_names = options['tags'].split(',')
        
        fake = Faker()
        Faker.seed(42)  # For reproducible results

        tag_objects = []
        for tag_name in tag_names:
            tag_obj, _ = UserTag.objects.get_or_create(name=tag_name)
            tag_objects.append(tag_obj)
        
        load_cnpm4_data()

        for _ in range(count):
            try:
                name = fake.name()
                email = f"{name.lower().replace(' ', '.')}@{fake.domain_name()}"
                password = 'password123'
                
                user = User.objects.create_user(
                    name=name,
                    email=email,
                    password=password
                )
                
                user.tags.set(random.sample(tag_objects, random.randint(1, min(3, len(tag_objects)))))
                
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.name} - {user.email} - Tags: {[tag.name for tag in user.tags.all()]}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating user: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully generated {count} fake users'))
