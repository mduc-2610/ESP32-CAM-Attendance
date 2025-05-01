# users/management/commands/generate_fake_users.py
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User
from faker import Faker
import random

class Command(BaseCommand):
    help = 'Generate fake users for testing'
    
    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of fake users to generate')
        parser.add_argument('--tags', type=str, default='CNMP4,IT101,AI202,CS305', help='Comma-separated list of tags')
    
    def handle(self, *args, **options):
        count = options['count']
        tags = options['tags'].split(',')
        
        fake = Faker()
        Faker.seed(42)  # For reproducible results
        
        # Create users
        for i in range(count):
            try:
                name = fake.name()
                email = f"{name.lower().replace(' ', '.')}@{fake.domain_name()}"
                tag = random.choice(tags)
                
                user = User.objects.create(
                    name=name,
                    email=email,
                    tag=tag
                )
                
                # Create user directory for face images
                user_dir = os.path.join(settings.MEDIA_ROOT, str(user.uuid))
                os.makedirs(user_dir, exist_ok=True)
                
                self.stdout.write(self.style.SUCCESS(f'Created user: {user.name} - {user.email} - {user.tag}'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating user: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully generated {count} fake users'))