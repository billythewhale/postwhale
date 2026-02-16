package scanner

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestParseOpenAPIGroupName(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		fileName    string
		expected    string
		shouldParse bool
	}{
		{fileName: "openapi.yml", expected: "public", shouldParse: true},
		{fileName: "openapi.yaml", expected: "public", shouldParse: true},
		{fileName: "openapi.internal.yml", expected: "internal", shouldParse: true},
		{fileName: "openapi.my-group.yaml", expected: "my-group", shouldParse: true},
		{fileName: "openapi.INTERNAL.yml", shouldParse: false},
		{fileName: "openapi.foo.bar.yml", shouldParse: false},
		{fileName: "openapi.private.json", shouldParse: false},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.fileName, func(t *testing.T) {
			t.Parallel()
			groupName, ok := parseOpenAPIGroupName(tc.fileName)
			if ok != tc.shouldParse {
				t.Fatalf("expected parse=%v, got parse=%v", tc.shouldParse, ok)
			}
			if groupName != tc.expected {
				t.Fatalf("expected group %q, got %q", tc.expected, groupName)
			}
		})
	}
}

func TestFindOpenAPIFiles_ValidGroupsOnly(t *testing.T) {
	t.Parallel()

	servicePath := t.TempDir()
	writeTestFile(t, filepath.Join(servicePath, "openapi.yml"), "openapi: 3.0.0\n")
	writeTestFile(t, filepath.Join(servicePath, "openapi.internal.yml"), "openapi: 3.0.0\n")
	writeTestFile(t, filepath.Join(servicePath, "openapi.my-group.yaml"), "openapi: 3.0.0\n")
	writeTestFile(t, filepath.Join(servicePath, "openapi.foo.bar.yml"), "openapi: 3.0.0\n")
	writeTestFile(t, filepath.Join(servicePath, "openapi.INTERNAL.yml"), "openapi: 3.0.0\n")

	files := findOpenAPIFiles(servicePath)
	if len(files) != 3 {
		t.Fatalf("expected 3 valid OpenAPI files, got %d", len(files))
	}

	actualGroups := []string{files[0].GroupName, files[1].GroupName, files[2].GroupName}
	expectedGroups := []string{"public", "internal", "my-group"}
	if !slices.Equal(actualGroups, expectedGroups) {
		t.Fatalf("expected groups %v, got %v", expectedGroups, actualGroups)
	}
}

func TestFindOpenAPIFiles_RefreshPrefersYMLForExistingGroup(t *testing.T) {
	t.Parallel()

	servicePath := t.TempDir()
	yamlPath := filepath.Join(servicePath, "openapi.internal.yaml")
	ymlPath := filepath.Join(servicePath, "openapi.internal.yml")

	writeTestFile(t, yamlPath, "openapi: 3.0.0\n")
	files := findOpenAPIFiles(servicePath)
	if len(files) != 1 {
		t.Fatalf("expected 1 OpenAPI file, got %d", len(files))
	}
	if files[0].Path != yamlPath {
		t.Fatalf("expected initial file %q, got %q", yamlPath, files[0].Path)
	}

	writeTestFile(t, ymlPath, "openapi: 3.0.0\n")
	files = findOpenAPIFiles(servicePath)
	if len(files) != 1 {
		t.Fatalf("expected 1 OpenAPI file after refresh, got %d", len(files))
	}
	if files[0].GroupName != "internal" {
		t.Fatalf("expected group internal, got %q", files[0].GroupName)
	}
	if files[0].Path != ymlPath {
		t.Fatalf("expected refreshed file %q, got %q", ymlPath, files[0].Path)
	}

	files = findOpenAPIFiles(servicePath)
	if files[0].Path != ymlPath {
		t.Fatalf("expected deterministic file selection %q, got %q", ymlPath, files[0].Path)
	}
}

func TestScanRepository_ValidRepoWithEndpointGroups(t *testing.T) {
	t.Parallel()

	repoPath := t.TempDir()
	createServiceFixture(t, repoPath, "virgil", 8080, map[string]string{
		"openapi.yml": `openapi: 3.0.0
info:
  title: Virgil Public API
  version: "1.0.0"
paths:
  /poems:
    get:
      operationId: listPoems
`,
		"openapi.internal.yml": `openapi: 3.0.0
info:
  title: Virgil Internal API
  version: "1.0.0"
paths:
  /admin/sync:
    post:
      operationId: syncAdmin
`,
		"openapi.my-group.yml": `openapi: 3.0.0
info:
  title: Virgil Special Group
  version: "1.0.0"
paths:
  /special:
    patch:
      operationId: patchSpecial
`,
	})

	result := ScanRepository(repoPath)

	if len(result.Errors) > 0 {
		t.Fatalf("expected no errors, got %v", result.Errors)
	}
	if len(result.Services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(result.Services))
	}

	service := result.Services[0]
	if service.ServiceID != "virgil" {
		t.Fatalf("expected serviceID virgil, got %q", service.ServiceID)
	}
	if service.Name != "Virgil Public API" {
		t.Fatalf("expected service name from public OpenAPI, got %q", service.Name)
	}
	if len(service.EndpointGroups) != 3 {
		t.Fatalf("expected 3 endpoint groups, got %d", len(service.EndpointGroups))
	}

	groupNames := []string{
		service.EndpointGroups[0].Name,
		service.EndpointGroups[1].Name,
		service.EndpointGroups[2].Name,
	}
	expectedGroups := []string{"public", "internal", "my-group"}
	if !slices.Equal(groupNames, expectedGroups) {
		t.Fatalf("expected groups %v, got %v", expectedGroups, groupNames)
	}

	if len(service.Endpoints) != 3 {
		t.Fatalf("expected flattened endpoint count 3, got %d", len(service.Endpoints))
	}
}

func TestScanRepository_NoServicesDir(t *testing.T) {
	t.Parallel()

	repoPath := t.TempDir()
	result := ScanRepository(repoPath)

	if len(result.Errors) == 0 {
		t.Fatal("expected error for missing services directory")
	}
	if len(result.Services) != 0 {
		t.Fatalf("expected 0 services, got %d", len(result.Services))
	}
}

func TestScanRepository_EmptyPath(t *testing.T) {
	t.Parallel()

	result := ScanRepository("")

	if len(result.Errors) == 0 {
		t.Fatal("expected error for empty path")
	}
	if len(result.Services) != 0 {
		t.Fatalf("expected 0 services, got %d", len(result.Services))
	}
}

func createServiceFixture(t *testing.T, repoPath string, serviceID string, port int, openAPI map[string]string) {
	t.Helper()

	servicePath := filepath.Join(repoPath, "services", serviceID)
	if err := os.MkdirAll(servicePath, 0o755); err != nil {
		t.Fatalf("failed to create service directory: %v", err)
	}

	config := map[string]interface{}{
		"env": map[string]interface{}{
			"PORT":       port,
			"SERVICE_ID": serviceID,
		},
		"serviceId":   serviceID,
		"gitRepo":     "git@github.com:triplewhale/" + serviceID,
		"deployments": map[string]interface{}{},
	}
	configData, err := json.Marshal(config)
	if err != nil {
		t.Fatalf("failed to marshal config: %v", err)
	}
	writeTestFile(t, filepath.Join(servicePath, "tw-config.json"), string(configData))

	for fileName, contents := range openAPI {
		writeTestFile(t, filepath.Join(servicePath, fileName), contents)
	}
}

func writeTestFile(t *testing.T, path string, contents string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("failed to create directory for %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("failed to write file %s: %v", path, err)
	}
}
