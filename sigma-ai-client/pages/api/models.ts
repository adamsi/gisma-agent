import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { LEGAL_COPILOT_HOST } from '@/utils/app/const';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    // For local RAG backend, we'll return a default model since the backend
    // might not have a models endpoint
    const defaultModel: OpenAIModel = {
      id: OpenAIModelID.GPT_3_5,
      name: OpenAIModels[OpenAIModelID.GPT_3_5].name,
      maxLength: OpenAIModels[OpenAIModelID.GPT_3_5].maxLength,
      tokenLimit: OpenAIModels[OpenAIModelID.GPT_3_5].tokenLimit,
    };

    const models: OpenAIModel[] = [defaultModel];

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
