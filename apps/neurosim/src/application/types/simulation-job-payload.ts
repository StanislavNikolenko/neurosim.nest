export interface SimulationParams {
  durationMs: number;
  dtMs: number;
  nExc: number;
  nInh: number;
  pConnect: number;
  wInput: number;
  wRec: number;
  seed: number;
}

export interface SimulationJobPayload {
  simulationRunId: number;
  datasetId: string;
  correlationId: string;
  params: SimulationParams;
}
