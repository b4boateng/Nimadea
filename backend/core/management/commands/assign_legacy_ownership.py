from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Document, Workspace


class Command(BaseCommand):
    help = "Report or explicitly assign ownerless legacy workspaces and documents."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist the assignment. Without this flag, only report counts.",
        )

    def handle(self, *args, **options):
        username = options["username"]
        user_model = get_user_model()
        try:
            user = user_model.objects.get(username=username)
        except user_model.DoesNotExist as exc:
            raise CommandError(f"User '{username}' does not exist.") from exc

        workspace_query = Workspace.objects.filter(owner__isnull=True)
        document_query = Document.objects.filter(owner__isnull=True)
        workspace_count = workspace_query.count()
        document_count = document_query.count()

        if not options["apply"]:
            self.stdout.write(
                f"Found {workspace_count} ownerless workspaces and "
                f"{document_count} ownerless documents. "
                "Re-run with --apply to assign them."
            )
            return

        with transaction.atomic():
            workspace_query.update(owner=user)
            document_query.update(owner=user)

        self.stdout.write(
            self.style.SUCCESS(
                f"Assigned {workspace_count} workspaces and "
                f"{document_count} documents to {username}."
            )
        )
