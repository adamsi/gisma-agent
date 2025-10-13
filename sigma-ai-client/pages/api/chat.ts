export const config = {
  runtime: 'edge',
};

const handler = async (_req: Request): Promise<Response> => {
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const chunks = [
          'Hello! ',
          'This is a demo response ',
          'from the Sigma Agent chat API. ',
          'You can replace this with real model output later.'
        ];
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
