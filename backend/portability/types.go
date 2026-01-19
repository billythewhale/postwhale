package portability

type QueryParam struct {
	Key     string `yaml:"key"`
	Value   string `yaml:"value"`
	Enabled bool   `yaml:"enabled"`
}

type Header struct {
	Key     string `yaml:"key"`
	Value   string `yaml:"value"`
	Enabled bool   `yaml:"enabled"`
}

type EndpointRef struct {
	Method string `yaml:"method"`
	Path   string `yaml:"path"`
}

type PortableSavedRequest struct {
	Name        string            `yaml:"name"`
	Endpoint    EndpointRef       `yaml:"endpoint"`
	PathParams  map[string]string `yaml:"path_params,omitempty"`
	QueryParams []QueryParam      `yaml:"query_params,omitempty"`
	Headers     []Header          `yaml:"headers,omitempty"`
	Body        string            `yaml:"body,omitempty"`
}

type SavedRequestsFile struct {
	Version       int                    `yaml:"version"`
	ServiceID     string                 `yaml:"service_id"`
	SavedRequests []PortableSavedRequest `yaml:"saved_requests"`
}

type ImportResult struct {
	Added    int
	Replaced int
	Skipped  int
	Errors   []string
}

type ExportResult struct {
	FilePath string
	Count    int
}
