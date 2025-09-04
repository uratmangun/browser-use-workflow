#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create .xmcp directory if it doesn't exist
const xmcpDir = path.join(process.cwd(), '.xmcp');
if (!fs.existsSync(xmcpDir)) {
  fs.mkdirSync(xmcpDir, { recursive: true });
}

// Generate the adapter code that xmcp CLI would normally generate
const adapterCode = `
// Auto-generated xmcp adapter
import greet from '../src/tools/greet';

const tools = {
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
    schema: {
      name: {
        type: 'string',
        description: 'The name of the user to greet'
      }
    },
    handler: greet,
  },
};

export function xmcpHandler(req) {
  return handleMCPRequest(req, tools);
}

async function handleMCPRequest(req, tools) {
  const { NextResponse } = await import('next/server');
  
  try {
    const body = req.method === 'POST' ? await req.json() : null;
    
    // Handle MCP protocol requests
    if (req.method === 'GET' || (body && body.method === 'tools/list')) {
      const toolList = Object.values(tools).map(tool => ({
        name: tool.metadata.name,
        description: tool.metadata.description,
        inputSchema: {
          type: 'object',
          properties: tool.schema,
          required: Object.keys(tool.schema),
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
            message: error.message || 'Internal error',
          },
        }, { status: 500 });
      }
    }
    
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
`;

// Write the adapter file
const adapterPath = path.join(xmcpDir, 'adapter.js');
fs.writeFileSync(adapterPath, adapterCode.trim());

// Create TypeScript declaration file
const dtsCode = `
export declare function xmcpHandler(req: any): Promise<any>;
`;

const dtsPath = path.join(xmcpDir, 'adapter.d.ts');
fs.writeFileSync(dtsPath, dtsCode.trim());

// Create package.json for the adapter module
const packageJson = {
  "name": "@xmcp/adapter",
  "version": "1.0.0",
  "main": "adapter.js",
  "types": "adapter.d.ts",
  "private": true
};

const packageJsonPath = path.join(xmcpDir, 'package.json');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ xmcp adapter built successfully at .xmcp/adapter.js');
