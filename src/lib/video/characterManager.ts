import { v4 as uuidv4 } from 'uuid';
import { CharacterReference } from '../providers/video-provider.types';
import { saveProjectCharacter, getProjectCharacters, getCharacterById, DbProjectCharacter } from '../db';

export class CharacterManager {
  /**
   * Create or update a project character
   */
  public saveCharacter(userId: string, character: {
    id?: string;
    projectId?: string;
    name: string;
    description: string;
    referenceImageUrl?: string;
    gender?: string;
    voiceId?: string;
  }): CharacterReference {
    const charId = character.id || `char_${uuidv4().substring(0, 12)}`;
    const saved = saveProjectCharacter({
      id: charId,
      user_id: userId,
      project_id: character.projectId || null,
      name: character.name.trim(),
      description: character.description.trim(),
      reference_image_url: character.referenceImageUrl || null,
      gender: character.gender || null,
      voice_id: character.voiceId || null,
    });

    return {
      characterId: saved.id,
      name: saved.name,
      description: saved.description,
      referenceImageUrl: saved.reference_image_url || undefined,
      gender: saved.gender || undefined,
      voiceId: saved.voice_id || undefined,
    };
  }

  /**
   * Retrieve character reference for a project
   */
  public getCharacterForProject(userId: string, projectId?: string): CharacterReference | null {
    const list = getProjectCharacters(userId, projectId);
    if (list.length === 0) return null;
    const c = list[0];
    return {
      characterId: c.id,
      name: c.name,
      description: c.description,
      referenceImageUrl: c.reference_image_url || undefined,
      gender: c.gender || undefined,
      voiceId: c.voice_id || undefined,
    };
  }

  /**
   * Formats a scene prompt with character continuity instructions
   */
  public injectCharacterContinuity(
    basePrompt: string,
    character?: CharacterReference | null
  ): string {
    if (!character) return basePrompt;
    return `${basePrompt}. Character continuity: Featuring ${character.name} (${character.description}). Ensure consistent clothing, facial features, hair, and age across all scenes.`;
  }
}

export const characterManager = new CharacterManager();
