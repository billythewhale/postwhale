package scanner

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/triplewhale/postwhale/discovery"
)

// DiscoveredService represents a discovered service with its config and endpoints
type DiscoveredService struct {
	ServiceID      string
	Name           string
	Port           int
	Config         *discovery.TWConfig
	EndpointGroups []EndpointGroup
	Endpoints      []discovery.APIEndpoint
}

// EndpointGroup represents a named endpoint group discovered from an OpenAPI file.
type EndpointGroup struct {
	Name      string
	FilePath  string
	Endpoints []discovery.APIEndpoint
}

type openAPIFile struct {
	Path      string
	GroupName string
}

var openAPIGroupPattern = regexp.MustCompile(`^openapi\.([a-z0-9][a-z0-9-]*)\.(yml|yaml)$`)

// ScanResult contains the results of scanning a repository
type ScanResult struct {
	RepoPath string
	Services []DiscoveredService
	Errors   []string
}

// ScanRepository scans a repository path to discover all services and endpoints
func ScanRepository(repoPath string) ScanResult {
	result := ScanResult{
		RepoPath: repoPath,
		Services: []DiscoveredService{},
		Errors:   []string{},
	}

	// Validate input
	if repoPath == "" {
		result.Errors = append(result.Errors, "repository path is empty")
		return result
	}

	// Check if path exists
	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		result.Errors = append(result.Errors, fmt.Sprintf("repository path does not exist: %s", repoPath))
		return result
	}

	// Check for services directory
	servicesPath := filepath.Join(repoPath, "services")
	if _, err := os.Stat(servicesPath); os.IsNotExist(err) {
		result.Errors = append(result.Errors, fmt.Sprintf("services directory not found: %s", servicesPath))
		return result
	}

	// Read services directory
	entries, err := os.ReadDir(servicesPath)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("failed to read services directory: %v", err))
		return result
	}

	// Scan each service directory
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		servicePath := filepath.Join(servicesPath, entry.Name())
		service := scanService(servicePath)

		if service != nil {
			result.Services = append(result.Services, *service)
		}
	}

	return result
}

func parseOpenAPIGroupName(fileName string) (string, bool) {
	switch fileName {
	case "openapi.yml", "openapi.yaml":
		return "public", true
	}

	matches := openAPIGroupPattern.FindStringSubmatch(fileName)
	if len(matches) != 3 {
		return "", false
	}

	return matches[1], true
}

// findOpenAPIFiles finds all supported OpenAPI files and resolves endpoint groups from filenames.
// Supports: openapi.yml|yaml => public, and openapi.<group>.yml|yaml => <group>.
func findOpenAPIFiles(servicePath string) []openAPIFile {
	patterns := []string{"openapi*.yml", "openapi*.yaml"}
	groupToFile := map[string]openAPIFile{}

	for _, pattern := range patterns {
		matches, _ := filepath.Glob(filepath.Join(servicePath, pattern))
		for _, path := range matches {
			fileName := filepath.Base(path)
			groupName, ok := parseOpenAPIGroupName(fileName)
			if !ok {
				continue
			}
			if _, exists := groupToFile[groupName]; exists {
				continue
			}
			groupToFile[groupName] = openAPIFile{
				Path:      path,
				GroupName: groupName,
			}
		}
	}

	files := make([]openAPIFile, 0, len(groupToFile))
	for _, file := range groupToFile {
		files = append(files, file)
	}

	sort.Slice(files, func(i, j int) bool {
		if files[i].GroupName == "public" {
			return true
		}
		if files[j].GroupName == "public" {
			return false
		}
		return files[i].GroupName < files[j].GroupName
	})

	return files
}

// scanService scans a single service directory for config and endpoints
func scanService(servicePath string) *DiscoveredService {
	// Look for tw-config.json
	configPath := filepath.Join(servicePath, "tw-config.json")
	config, err := discovery.ParseTWConfig(configPath)
	if err != nil {
		// Skip services without valid config
		return nil
	}

	service := &DiscoveredService{
		ServiceID:      config.ServiceID,
		Name:           "", // Will be populated from OpenAPI
		Port:           config.Env.Port,
		Config:         config,
		EndpointGroups: []EndpointGroup{},
		Endpoints:      []discovery.APIEndpoint{},
	}

	openAPIFiles := findOpenAPIFiles(servicePath)
	if len(openAPIFiles) == 0 {
		service.Name = config.ServiceID
		return service
	}

	publicTitle := ""
	firstTitle := ""

	for _, file := range openAPIFiles {
		openapi, err := discovery.ParseOpenAPI(file.Path)
		if err != nil {
			continue
		}

		title := strings.TrimSpace(openapi.Info.Title)
		if file.GroupName == "public" && title != "" {
			publicTitle = title
		}
		if firstTitle == "" && title != "" {
			firstTitle = title
		}

		endpoints := discovery.ExtractEndpoints(openapi)
		service.EndpointGroups = append(service.EndpointGroups, EndpointGroup{
			Name:      file.GroupName,
			FilePath:  file.Path,
			Endpoints: endpoints,
		})
		service.Endpoints = append(service.Endpoints, endpoints...)
	}

	if len(service.EndpointGroups) == 0 {
		service.Name = config.ServiceID
		return service
	}

	switch {
	case publicTitle != "":
		service.Name = publicTitle
	case firstTitle != "":
		service.Name = firstTitle
	default:
		service.Name = config.ServiceID
	}

	return service
}
