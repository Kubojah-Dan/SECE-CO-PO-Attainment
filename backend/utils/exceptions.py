"""SECE CO-PO Platform — Custom Exception Handler"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler.
    Provides consistent error response format across all endpoints.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            'error': True,
            'status_code': response.status_code,
            'message': _extract_message(response.data),
            'details': response.data,
        }
        response.data = error_data
    else:
        # Unhandled exception — log and return 500
        logger.exception(f"Unhandled exception in {context.get('view')}: {exc}")
        response = Response({
            'error': True,
            'status_code': 500,
            'message': 'An unexpected server error occurred. Please contact the administrator.',
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response


def _extract_message(data) -> str:
    """Extract a human-readable message from DRF error data."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return data[0] if data else 'Validation error'
    if isinstance(data, dict):
        # non_field_errors or first field error
        if 'non_field_errors' in data:
            return str(data['non_field_errors'][0])
        if 'detail' in data:
            return str(data['detail'])
        if 'error' in data:
            return str(data['error'])
        first_val = next(iter(data.values()), None)
        if first_val:
            if isinstance(first_val, list):
                return str(first_val[0])
            return str(first_val)
    return 'An error occurred'
