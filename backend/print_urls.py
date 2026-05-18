import sys
from django.urls import get_resolver

def show_urls(lis, depth=0):
    for entry in lis:
        if hasattr(entry, 'url_patterns'):
            print("  " * depth + f"Group: {entry.pattern}")
            show_urls(entry.url_patterns, depth + 1)
        else:
            print("  " * depth + f"{entry.pattern} -> {entry.callback.__name__ if hasattr(entry.callback, '__name__') else entry.callback.__class__.__name__}")

resolver = get_resolver()
show_urls(resolver.url_patterns)
