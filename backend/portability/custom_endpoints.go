package portability

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

const CustomEndpointsFileName = "postwhale.endpoints.yml"

type customEndpointRow struct {
	ID                int64
	Method            string
	Path              string
	EndpointGroupName string
}

func GetCustomEndpoints(db *sql.DB, serviceID int64) ([]customEndpointRow, error) {
	rows, err := db.Query(
		"SELECT id, method, path, endpoint_group_name FROM endpoints WHERE service_id = ? AND is_custom = 1 ORDER BY endpoint_group_name, path, method",
		serviceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []customEndpointRow
	for rows.Next() {
		var r customEndpointRow
		if err := rows.Scan(&r.ID, &r.Method, &r.Path, &r.EndpointGroupName); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

func ExportServiceCustomEndpoints(db *sql.DB, serviceID int64) (*ExportResult, error) {
	svcID, svcPath, err := GetServicePath(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service path: %w", err)
	}

	endpoints, err := GetCustomEndpoints(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get custom endpoints: %w", err)
	}

	if len(endpoints) == 0 {
		return &ExportResult{FilePath: "", Count: 0}, nil
	}

	file := CustomEndpointsFile{
		Version:         CurrentVersion,
		ServiceID:       svcID,
		CustomEndpoints: make([]PortableCustomEndpoint, 0, len(endpoints)),
	}

	for _, ep := range endpoints {
		file.CustomEndpoints = append(file.CustomEndpoints, PortableCustomEndpoint{
			Method:            ep.Method,
			Path:              ep.Path,
			EndpointGroupName: ep.EndpointGroupName,
		})
	}

	filePath := filepath.Join(svcPath, CustomEndpointsFileName)
	data, err := yaml.Marshal(&file)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal YAML: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	return &ExportResult{FilePath: filePath, Count: len(file.CustomEndpoints)}, nil
}

type endpointMapEntry struct {
	ID       int64
	IsCustom bool
}

func buildEndpointMapWithCustomFlag(db *sql.DB, serviceID int64) (map[string]endpointMapEntry, error) {
	rows, err := db.Query(
		"SELECT id, method, path, endpoint_group_name, is_custom FROM endpoints WHERE service_id = ?",
		serviceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]endpointMapEntry)
	for rows.Next() {
		var id int64
		var method, path, groupName string
		var isCustom bool
		if err := rows.Scan(&id, &method, &path, &groupName, &isCustom); err != nil {
			return nil, err
		}
		key := method + ":" + path + ":" + groupName
		m[key] = endpointMapEntry{ID: id, IsCustom: isCustom}
	}
	return m, rows.Err()
}

func ImportServiceCustomEndpoints(db *sql.DB, serviceID int64) (*ImportResult, error) {
	svcID, svcPath, err := GetServicePath(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get service path: %w", err)
	}

	filePath := filepath.Join(svcPath, CustomEndpointsFileName)
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no %s file found in service directory", CustomEndpointsFileName)
		}
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var file CustomEndpointsFile
	if err := yaml.Unmarshal(data, &file); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	if file.ServiceID != svcID {
		return nil, fmt.Errorf("service_id mismatch: file has '%s', expected '%s'", file.ServiceID, svcID)
	}

	existingMap, err := buildEndpointMapWithCustomFlag(db, serviceID)
	if err != nil {
		return nil, fmt.Errorf("failed to build endpoint map: %w", err)
	}

	result := &ImportResult{Errors: []string{}}

	for _, ep := range file.CustomEndpoints {
		key := ep.Method + ":" + ep.Path + ":" + ep.EndpointGroupName
		if existing, ok := existingMap[key]; ok {
			if !existing.IsCustom {
				result.Errors = append(result.Errors, fmt.Sprintf("endpoint already exists (discovered): %s %s [%s]", ep.Method, ep.Path, ep.EndpointGroupName))
			}
			result.Skipped++
			continue
		}

		_, err := db.Exec(
			"INSERT INTO endpoints (service_id, method, path, operation_id, spec_json, endpoint_group_name, endpoint_group_file_path, is_custom) VALUES (?, ?, ?, '', '{}', ?, '', 1)",
			serviceID, ep.Method, ep.Path, ep.EndpointGroupName,
		)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("failed to add '%s %s': %v", ep.Method, ep.Path, err))
			result.Skipped++
			continue
		}
		result.Added++
	}

	return result, nil
}

func ExportRepoCustomEndpoints(db *sql.DB, repoID int64) ([]ExportResult, error) {
	services, err := GetRepoServices(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get services: %w", err)
	}

	var results []ExportResult
	for _, svc := range services {
		r, err := ExportServiceCustomEndpoints(db, svc.ID)
		if err != nil {
			results = append(results, ExportResult{FilePath: svc.ServiceID, Count: -1})
			continue
		}
		if r.Count > 0 {
			results = append(results, *r)
		}
	}
	return results, nil
}

func ImportRepoCustomEndpoints(db *sql.DB, repoID int64) (map[string]*ImportResult, error) {
	services, err := GetRepoServices(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get services: %w", err)
	}

	repoPath, err := GetRepoPath(db, repoID)
	if err != nil {
		return nil, fmt.Errorf("failed to get repo path: %w", err)
	}

	results := make(map[string]*ImportResult)
	for _, svc := range services {
		filePath := filepath.Join(repoPath, "services", svc.ServiceID, CustomEndpointsFileName)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			continue
		}

		r, err := ImportServiceCustomEndpoints(db, svc.ID)
		if err != nil {
			results[svc.ServiceID] = &ImportResult{Errors: []string{err.Error()}}
			continue
		}
		results[svc.ServiceID] = r
	}
	return results, nil
}
