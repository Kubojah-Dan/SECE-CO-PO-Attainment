from django.apps import AppConfig

class SubjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.subjects'
    verbose_name = 'Subjects'

    def ready(self):
        # FIX 8: Register signals that invalidate stale attainment records
        # when CO-PO or CO-PSO mappings are created, updated, or deleted.
        import apps.subjects.signals  # noqa: F401
