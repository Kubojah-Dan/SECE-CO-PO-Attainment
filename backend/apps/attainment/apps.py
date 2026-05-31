from django.apps import AppConfig

class AttainmentAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.attainment'
    verbose_name = 'Attainment'

    def ready(self):
        # FIX 8: Register signals that clear stale attainment records
        # when AttainmentConfig thresholds or weightages are updated.
        import apps.attainment.signals  # noqa: F401
