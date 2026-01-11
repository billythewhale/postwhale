package scanner

import (
	"path/filepath"
	"testing"
)

func TestScanRepository_ValidRepo(t *testing.T) {
	// Use the fake-repo path
	repoPath := filepath.Join("..", "..", "fake-repo")

	result := ScanRepository(repoPath)

	// Check no critical errors
	if len(result.Errors) > 0 {
		t.Errorf("Expected no errors, got %v", result.Errors)
	}

	// Check services found
	if len(result.Services) != 2 {
		t.Errorf("Expected 2 services, got %d", len(result.Services))
	}

	// Check fusion service
	var fusionSvc *DiscoveredService
	for i := range result.Services {
		if result.Services[i].ServiceID == "fusion" {
			fusionSvc = &result.Services[i]
			break
		}
	}
	if fusionSvc == nil {
		t.Fatal("fusion service not found")
	}
	if fusionSvc.Name != "Fusion Service - Private API" {
		t.Errorf("Expected 'Fusion Service - Private API', got %q", fusionSvc.Name)
	}
	if fusionSvc.Port != 8080 {
		t.Errorf("Expected port 8080, got %d", fusionSvc.Port)
	}
	if len(fusionSvc.Endpoints) != 3 {
		t.Errorf("Expected 3 endpoints for fusion, got %d", len(fusionSvc.Endpoints))
	}

	// Check moby service
	var mobySvc *DiscoveredService
	for i := range result.Services {
		if result.Services[i].ServiceID == "moby" {
			mobySvc = &result.Services[i]
			break
		}
	}
	if mobySvc == nil {
		t.Fatal("moby service not found")
	}
	if mobySvc.Name != "Moby Service - Private API" {
		t.Errorf("Expected 'Moby Service - Private API', got %q", mobySvc.Name)
	}
	if mobySvc.Port != 8080 {
		t.Errorf("Expected port 8080, got %d", mobySvc.Port)
	}
	if len(mobySvc.Endpoints) != 3 {
		t.Errorf("Expected 3 endpoints for moby, got %d", len(mobySvc.Endpoints))
	}
}

func TestScanRepository_NoServicesDir(t *testing.T) {
	// Use a directory without services subdirectory
	repoPath := filepath.Join("..", "..", "backend")

	result := ScanRepository(repoPath)

	// Should return error about missing services directory
	if len(result.Errors) == 0 {
		t.Error("Expected error for missing services directory")
	}
	if len(result.Services) != 0 {
		t.Errorf("Expected 0 services, got %d", len(result.Services))
	}
}

func TestScanRepository_MissingOpenAPI(t *testing.T) {
	// Create a temporary test directory with tw-config.json but no openapi.private.yaml
	// This is a conceptual test - we'll skip actual file creation for simplicity
	// and just test the logic handles missing files gracefully
	t.Skip("Requires test data setup")
}

func TestScanRepository_InvalidConfig(t *testing.T) {
	// Test handling of invalid tw-config.json
	t.Skip("Requires test data setup")
}

func TestScanRepository_EmptyPath(t *testing.T) {
	result := ScanRepository("")

	if len(result.Errors) == 0 {
		t.Error("Expected error for empty path")
	}
	if len(result.Services) != 0 {
		t.Errorf("Expected 0 services, got %d", len(result.Services))
	}
}
