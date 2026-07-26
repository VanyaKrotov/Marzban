import os
import shutil
import tempfile

from fastapi import Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from starlette.background import BackgroundTask

from app.db import Session, get_db
from app.models.admin import Admin
from app.models.settings import RuntimeSettingsModify, SubscriptionTemplateModify
from app.utils.backups import (
    create_full_backup_archive,
    database_backup_filename,
    dump_database_sql,
    full_backup_filename,
    restore_database_sql,
    restore_full_backup_archive,
)
from app.utils.runtime_settings import (
    get_runtime_settings,
    get_subscription_templates,
    runtime_settings_response,
    update_runtime_settings,
    update_subscription_template,
)


def _remove_file(path: str) -> None:
    if os.path.exists(path):
        os.unlink(path)


def get_settings(admin: Admin = Depends(Admin.check_sudo_admin)):
    return runtime_settings_response(get_runtime_settings())


def modify_settings(
    modified_settings: RuntimeSettingsModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    settings = update_runtime_settings(db, modified_settings)
    return runtime_settings_response(settings)


def get_settings_subscription_templates(admin: Admin = Depends(Admin.check_sudo_admin)):
    return list(get_subscription_templates())


def modify_settings_subscription_template(
    template_key: str,
    modified_template: SubscriptionTemplateModify,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    try:
        return update_subscription_template(db, template_key, modified_template.content)
    except KeyError:
        raise HTTPException(status_code=404, detail="Template not found")


def download_database_backup(admin: Admin = Depends(Admin.check_sudo_admin)):
    return Response(
        content=dump_database_sql(),
        media_type="application/sql",
        headers={
            "Content-Disposition": f'attachment; filename="{database_backup_filename()}"'
        },
    )


def restore_database_backup(
    file: UploadFile,
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    if not file.filename or not file.filename.lower().endswith(".sql"):
        raise HTTPException(status_code=422, detail="Upload a .sql backup file")
    restore_database_sql(file.file.read())
    return {"detail": "Database restored"}


def download_full_backup(admin: Admin = Depends(Admin.check_sudo_admin)):
    archive_path = create_full_backup_archive()
    return FileResponse(
        archive_path,
        media_type="application/zip",
        filename=full_backup_filename(),
        background=BackgroundTask(_remove_file, archive_path),
    )


def restore_full_backup(
    file: UploadFile,
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=422, detail="Upload a .zip backup archive")

    fd, archive_path = tempfile.mkstemp(prefix="marzbannext_restore_", suffix=".zip")
    os.close(fd)
    try:
        with open(archive_path, "wb") as target:
            shutil.copyfileobj(file.file, target)
        restore_full_backup_archive(archive_path)
    finally:
        try:
            os.unlink(archive_path)
        except FileNotFoundError:
            pass
    return {"detail": "Backup restored"}
