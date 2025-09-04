// Manual xmcp adapter workaround for Node.js v22 compatibility issue
import { NextRequest, NextResponse } from 'next/server';
import greet from '@/tools/greet';

// Define available tools
const tools: Record<string, {
  metadata: {
    name: string;
    description: string;
    annotations: {
      title: string;
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
    };
  };
  handler: (args: any) => Promise<any>;
}> = {
  greet: {
    metadata: {
      name: 'greet',
      description: 'Greet the user',
      annotations: {
        title: 'Greet the user',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    handler: greet,
  },
};

interface MCPRequest {
  method?: string;
  params?: {
    name?: string;
    arguments?: any;
  };
}

// MCP protocol handler
export async function xmcpHandler(req: NextRequest) {
  try {
    const body: MCPRequest | null = req.method === 'POST' ? await req.json() : null;
    
    // Handle MCP protocol requests
    if (req.method === 'GET' || (body && body.method === 'tools/list')) {
      // Return list of available tools
      const toolList = Object.values(tools).map(tool => ({
        name: tool.metadata.name,
        description: tool.metadata.description,
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the user to greet',
            },
          },
          required: ['name'],
        },
      }));
      
      return NextResponse.json({
        tools: toolList,
      });
    }
    
    // Handle tool execution
    if (body && body.method === 'tools/call') {
      const toolName = body.params?.name;
      const toolArgs = body.params?.arguments;
      
      if (!toolName || !tools[toolName]) {
        return NextResponse.json({
          error: {
            code: -32601,
            message: 'Tool not found',
          },
        }, { status: 404 });
      }
      
      try {
        const result = await tools[toolName].handler(toolArgs);
        return NextResponse.json({
          result,
        });
      } catch (error) {
        return NextResponse.json({
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        }, { status: 500 });
      }
    }
    
    // Default response for unsupported methods
    return NextResponse.json({
      error: {
        code: -32601,
        message: 'Method not found',
      },
    }, { status: 404 });
    
  } catch (error) {
    return NextResponse.json({
      error: {
        code: -32700,
        message: 'Parse error',
      },
    }, { status: 400 });
  }
}
