import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User, UserTag
from faker import Faker
import random

class Command(BaseCommand):
    help = 'Generate fake users for testing'
    
    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of fake users to generate')
        parser.add_argument('--tags', type=str, default='CNMP4,IT101,AI202,CS305', help='Comma-separated list of tags')
    
    def handle(self, *args, **options):
        count = options['count']
        tag_names = options['tags'].split(',')
        
        fake = Faker()
        Faker.seed(42)  # For reproducible results

        # Ensure all provided tags exist
        tag_objects = []
        for tag_name in tag_names:
            tag_obj, _ = UserTag.objects.get_or_create(name=tag_name)
            tag_objects.append(tag_obj)
        
        for _ in range(count):
            try:
                name = fake.name()
                email = f"{name.lower().replace(' ', '.')}@{fake.domain_name()}"
                password = 'password123'  # Default password
                
                user = User.objects.create_user(
                    name=name,
                    email=email,
                    password=password
                )
                
                # Assign 1–3 random tags
                user.tags.set(random.sample(tag_objects, random.randint(1, min(3, len(tag_objects)))))
                
                # Create user directory for face images
                user_dir = os.path.join(settings.MEDIA_ROOT, str(user.uuid))
                os.makedirs(user_dir, exist_ok=True)
                
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.name} - {user.email} - Tags: {[tag.name for tag in user.tags.all()]}'))
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating user: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully generated {count} fake users'))
