

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

# import os
# from celery import Celery

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# app = Celery('backend')

# app.config_from_object('django.conf:settings', namespace='CELERY')
# app.conf.broker_url = 'memory://'          # force override
# app.conf.result_backend = 'cache+memory://'
# app.conf.task_always_eager = True
# app.conf.task_eager_propagates = False

# app.autodiscover_tasks()