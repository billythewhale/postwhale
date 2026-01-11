package discovery

import (
	"encoding/json"
	"os"
)

// ParseTWConfig parses a tw-config.json file
func ParseTWConfig(path string) (*TWConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config TWConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}
