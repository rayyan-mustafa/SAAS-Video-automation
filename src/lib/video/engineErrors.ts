export type EngineErrorCode =
  | 'NO_VALID_CLIPS'
  | 'NO_VALID_AUDIO'
  | 'TIMED_OUT'
  | 'UNVERIFIED_MODEL'
  | 'MODEL_UNVERIFIED'
  | 'NO_MODEL_IN_TIER'
  | 'BUDGET_EXCEEDED'
  | 'PROMPT_MODERATION_FAILED'
  | 'BAND_OVERFLOW'
  | 'STAGE_EXECUTION_FAILED';

export class EngineError extends Error {
  code: EngineErrorCode;
  statusCode: number;

  constructor(code: EngineErrorCode, message: string, statusCode: number = 500) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
