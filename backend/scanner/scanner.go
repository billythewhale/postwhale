package scanner

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/triplewhale/postwhale/discovery"
)

// DiscoveredService represents a discovered service with its config and endpoints
type DiscoveredService struct {
	ServiceID string
	Name      string
	Port      int
	Config    *discovery.TWConfig
	Endpoints []discovery.APIEndpoint
}

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
		ServiceID: config.ServiceID,
		Name:      "", // Will be populated from OpenAPI
		Port:      config.Env.Port,
		Config:    config,
		Endpoints: []discovery.APIEndpoint{},
	}

	// Look for openapi.private.yaml
	openapiPath := filepath.Join(servicePath, "openapi.private.yaml")
	openapi, err := discovery.ParseOpenAPI(openapiPath)
	if err != nil {
		// Service has config but no OpenAPI - use serviceID as name
		service.Name = config.ServiceID
		return service
	}

	// Get service name from OpenAPI info
	service.Name = openapi.Info.Title

	// Extract endpoints
	endpoints := discovery.ExtractEndpoints(openapi)
	service.Endpoints = endpoints

	return service
}
