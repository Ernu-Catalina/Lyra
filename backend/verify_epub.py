#!/usr/bin/env python3
"""
EPUB Export Feature - Verification Script
Checks that all components are properly installed and integrated.
"""

import sys
import os

def check_backend_structure():
    """Verify backend files and structure."""
    print("\n🔍 Checking Backend Structure...")
    
    backend_path = os.path.dirname(os.path.abspath(__file__))
    
    checks = {
        "Export service": os.path.exists(os.path.join(backend_path, "app", "services", "export_service.py")),
        "Documents route": os.path.exists(os.path.join(backend_path, "app", "routes", "documents.py")),
        "Requirements.txt": os.path.exists(os.path.join(backend_path, "requirements.txt")),
        "Test file": os.path.exists(os.path.join(backend_path, "tests", "test_epub_export.py")),
    }
    
    for check, passed in checks.items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check}")
    
    return all(checks.values())

def check_imports():
    """Verify all required imports are available."""
    print("\n🔍 Checking Required Imports...")
    
    imports = {
        "ebooklib": "EPUB generation",
        "bs4": "HTML parsing",
        "docx": "DOCX export",
        "reportlab": "PDF export",
        "fastapi": "Web framework",
    }
    
    all_available = True
    for module, description in imports.items():
        try:
            __import__(module)
            print(f"  ✓ {module:<15} ({description})")
        except ImportError as e:
            print(f"  ✗ {module:<15} ({description}) - NOT INSTALLED")
            all_available = False
    
    return all_available

def check_export_service():
    """Check that export_service has build_epub function."""
    print("\n🔍 Checking Export Service...")
    
    try:
        from app.services.export_service import build_epub, build_docx, build_pdf
        print("  ✓ build_epub function imported successfully")
        print("  ✓ build_docx function imported successfully")
        print("  ✓ build_pdf function imported successfully")
        return True
    except ImportError as e:
        print(f"  ✗ Failed to import export functions: {e}")
        return False

def check_routes():
    """Check that routes include EPUB endpoint."""
    print("\n🔍 Checking Routes...")
    
    try:
        from app.routes.documents import router
        
        # Check routes
        route_paths = [route.path for route in router.routes]
        epub_found = any("export/epub" in path for path in route_paths)
        
        if epub_found:
            print("  ✓ EPUB export endpoint found in routes")
            return True
        else:
            print("  ✗ EPUB export endpoint NOT found in routes")
            print(f"    Available routes: {route_paths}")
            return False
    except Exception as e:
        print(f"  ✗ Failed to check routes: {e}")
        return False

def test_epub_generation():
    """Test basic EPUB generation."""
    print("\n🔍 Testing EPUB Generation...")
    
    try:
        from app.services.export_service import build_epub
        import io
        import zipfile
        
        chapters = [
            {
                "id": "ch1",
                "title": "Test Chapter",
                "order": 0,
                "scenes": [
                    {
                        "id": "sc1",
                        "title": "Test Scene",
                        "order": 0,
                        "content": "<p>Test content</p>",
                    }
                ],
            }
        ]
        
        settings = {
            "defaultFont": "Arial",
            "defaultFontSize": 12,
            "language": "en",
        }
        
        epub_data = build_epub("Test Document", chapters, settings)
        
        if not isinstance(epub_data, bytes):
            print("  ✗ build_epub didn't return bytes")
            return False
        
        if len(epub_data) < 1000:
            print(f"  ✗ Generated EPUB too small ({len(epub_data)} bytes)")
            return False
        
        # Verify it's a valid zip
        try:
            with zipfile.ZipFile(io.BytesIO(epub_data), "r") as z:
                if "mimetype" not in z.namelist():
                    print("  ✗ EPUB missing mimetype file")
                    return False
                
                mimetype = z.read("mimetype").decode("utf-8").strip()
                if mimetype != "application/epub+zip":
                    print(f"  ✗ Wrong EPUB mimetype: {mimetype}")
                    return False
        except zipfile.BadZipFile:
            print("  ✗ Generated file is not a valid ZIP/EPUB")
            return False
        
        print(f"  ✓ EPUB generated successfully ({len(epub_data)} bytes)")
        print("  ✓ EPUB structure is valid")
        print("  ✓ EPUB contains proper mimetype")
        return True
        
    except Exception as e:
        print(f"  ✗ EPUB generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all checks."""
    print("=" * 60)
    print("EPUB EXPORT FEATURE - VERIFICATION")
    print("=" * 60)
    
    checks = [
        ("Backend Structure", check_backend_structure),
        ("Required Imports", check_imports),
        ("Export Service", check_export_service),
        ("Routes Configuration", check_routes),
        ("EPUB Generation", test_epub_generation),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} check failed with error: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:<8} {name}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL CHECKS PASSED - EPUB EXPORT IS READY TO USE!")
    else:
        print("❌ SOME CHECKS FAILED - SEE DETAILS ABOVE")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
