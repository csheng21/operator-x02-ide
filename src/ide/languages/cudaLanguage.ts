// src/ide/languages/cudaLanguage.ts
// CUDA LANGUAGE SUPPORT for Operator X02 - Phase 1: Jetson Aware
// Registers CUDA as a Monaco language with syntax highlighting.
// Includes onDidCreateModel listener to FORCE cuda language on .cu files
// (needed because X02 file-openers pass their own language to createModel).

export function registerCudaLanguage(): void {
  const monaco = (window as any).monaco;
  if (!monaco) {
    console.warn('[CUDA] Monaco not available, retrying in 500ms...');
    setTimeout(registerCudaLanguage, 500);
    return;
  }

  const existingLangs = monaco.languages.getLanguages();
  if (existingLangs.some((l: any) => l.id === 'cuda')) {
    console.log('[CUDA] Language already registered');
    return;
  }

  console.log('[CUDA] Registering CUDA language support...');

  // Register language ID
  monaco.languages.register({
    id: 'cuda',
    extensions: ['.cu', '.cuh', '.ptx'],
    aliases: ['CUDA', 'cuda', 'CUDA C++'],
    mimetypes: ['text/x-cuda-src'],
  });

  // Monarch tokenizer (syntax highlighting rules)
  monaco.languages.setMonarchTokensProvider('cuda', {
    defaultToken: '',
    tokenPostfix: '.cuda',
    cudaQualifiers: [
      '__global__', '__device__', '__host__', '__shared__',
      '__constant__', '__managed__', '__restrict__',
      '__noinline__', '__forceinline__', '__launch_bounds__',
    ],
    cudaBuiltins: [
      'threadIdx', 'blockIdx', 'blockDim', 'gridDim', 'warpSize',
      'atomicAdd', 'atomicSub', 'atomicExch', 'atomicMin', 'atomicMax',
      'atomicInc', 'atomicDec', 'atomicCAS', 'atomicAnd', 'atomicOr', 'atomicXor',
      '__syncthreads', '__syncwarp', '__threadfence',
      '__shfl_sync', '__shfl_up_sync', '__shfl_down_sync', '__shfl_xor_sync',
      'cudaMalloc', 'cudaFree', 'cudaMemcpy', 'cudaMemset',
      'cudaMallocManaged', 'cudaDeviceSynchronize',
      'cudaGetDeviceCount', 'cudaSetDevice', 'cudaGetDevice',
      'cudaGetDeviceProperties', 'cudaStreamCreate', 'cudaStreamSynchronize',
      'cudaEventCreate', 'cudaEventRecord', 'cudaEventElapsedTime',
      'cudaGetLastError', 'cudaGetErrorString', 'cudaPeekAtLastError',
    ],
    cudaTypes: [
      'dim3', 'float2', 'float3', 'float4', 'int2', 'int3', 'int4',
      'uint2', 'uint3', 'uint4', 'half', 'half2', '__half', '__half2',
      'cudaError_t', 'cudaStream_t', 'cudaEvent_t', 'cudaDeviceProp', 'cudaMemcpyKind',
      'cublasHandle_t', 'curandState', 'cudnnHandle_t',
    ],
    tensorrtTypes: [
      'nvinfer1', 'IBuilder', 'INetworkDefinition', 'ICudaEngine',
      'IExecutionContext', 'IRuntime', 'Dims', 'Dims2', 'Dims3', 'Dims4',
    ],
    keywords: [
      'auto', 'break', 'case', 'catch', 'class', 'const', 'constexpr',
      'continue', 'default', 'delete', 'do', 'else', 'enum', 'explicit',
      'extern', 'false', 'for', 'friend', 'goto', 'if', 'inline',
      'namespace', 'new', 'noexcept', 'nullptr', 'operator',
      'private', 'protected', 'public', 'return', 'sizeof',
      'static', 'struct', 'switch', 'template', 'this',
      'throw', 'true', 'try', 'typedef', 'typename', 'union',
      'using', 'virtual', 'void', 'volatile', 'while',
      'int', 'long', 'short', 'char', 'float', 'double', 'unsigned',
      'signed', 'bool', 'size_t',
    ],
    operators: [
      '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
      '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
      '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
      '%=', '<<=', '>>=', '->', '::',
    ],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4})/,
    tokenizer: {
      root: [
        [/<<</, 'delimiter.cuda', '@cudaLaunch'],
        [/#\s*\w+/, 'keyword.directive.preprocessor'],
        [/__\w+__/, {
          cases: { '@cudaQualifiers': 'keyword.cuda.qualifier', '@default': 'identifier' }
        }],
        [/[a-zA-Z_]\w*/, {
          cases: {
            '@cudaBuiltins': 'variable.predefined.cuda',
            '@cudaTypes': 'type.cuda',
            '@tensorrtTypes': 'type.tensorrt',
            '@keywords': 'keyword',
            '@default': 'identifier',
          }
        }],
        { include: '@whitespace' },
        [/[{}()\[\]]/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+[uUlL]*/, 'number.hex'],
        [/\d+[uUlL]*/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'[^\\']'/, 'string.char'],
        [/;/, 'delimiter'],
        [/,/, 'delimiter'],
      ],
      cudaLaunch: [
        [/>>>/, 'delimiter.cuda', '@pop'],
        [/[^>]+/, 'variable.parameter.cuda'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
    },
  });

  // Language configuration (brackets, comments, auto-close)
  monaco.languages.setLanguageConfiguration('cuda', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')'], ['<<<', '>>>']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: '/*', close: ' */', notIn: ['string'] },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '<', close: '>' },
    ],
    indentationRules: {
      increaseIndentPattern: /^((?!\/\/).)*(\{[^}"']*|\([^)"']*)$/,
      decreaseIndentPattern: /^\s*[}\])].*$/,
    },
  });

  // CUDA code snippets
  monaco.languages.registerCompletionItemProvider('cuda', {
    provideCompletionItems: () => {
      const suggestions = [
        {
          label: '__global__ kernel',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '__global__ void ${1:kernelName}(${2:float* data}, ${3:int n}) {\n\tint idx = blockIdx.x * blockDim.x + threadIdx.x;\n\tif (idx < n) {\n\t\t${4:// kernel body}\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'CUDA kernel function template',
        },
        {
          label: 'kernel launch <<<>>>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '${1:kernelName}<<<${2:numBlocks}, ${3:blockSize}>>>(${4:args});\ncudaDeviceSynchronize();',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'CUDA kernel launch with sync',
        },
        {
          label: 'cudaMalloc pattern',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'float* d_${1:data};\ncudaMalloc(&d_${1:data}, ${2:n} * sizeof(float));\ncudaMemcpy(d_${1:data}, ${3:h_data}, ${2:n} * sizeof(float), cudaMemcpyHostToDevice);\n\n${4:// kernel}\n\ncudaMemcpy(${3:h_data}, d_${1:data}, ${2:n} * sizeof(float), cudaMemcpyDeviceToHost);\ncudaFree(d_${1:data});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'CUDA memory allocation and transfer pattern',
        },
        {
          label: 'CUDA error check macro',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '#define CUDA_CHECK(call) do { \\\n\tcudaError_t err = call; \\\n\tif (err != cudaSuccess) { \\\n\t\tfprintf(stderr, "CUDA error %s:%d: %s\\n", __FILE__, __LINE__, cudaGetErrorString(err)); \\\n\t\texit(EXIT_FAILURE); \\\n\t} \\\n} while(0)',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'CUDA error checking macro',
        },
        {
          label: '__shared__ memory pattern',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '__shared__ ${1:float} s_${2:data}[${3:BLOCK_SIZE}];\ns_${2:data}[threadIdx.x] = ${4:globalData}[blockIdx.x * blockDim.x + threadIdx.x];\n__syncthreads();\n${5:// use shared memory}\n__syncthreads();',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Shared memory with sync barriers',
        },
        {
          label: 'Jetson TensorRT inference',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '// TensorRT inference on Jetson\nauto runtime = nvinfer1::createInferRuntime(${1:logger});\nauto engine = runtime->deserializeCudaEngine(${2:modelData}, ${3:modelSize});\nauto context = engine->createExecutionContext();\nvoid* buffers[${4:2}];\ncudaMalloc(&buffers[0], ${5:inputSize});\ncudaMalloc(&buffers[1], ${6:outputSize});\ncontext->executeV2(buffers);\ncudaDeviceSynchronize();',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'TensorRT inference boilerplate for Jetson',
        },
      ];
      return { suggestions };
    },
  });

  // ============================================
  // KEY FIX: Force cuda language on .cu files
  // ============================================
  // X02's file-openers (tabManager, editorManager, etc.) determine
  // language from their own extension map and pass it to createModel().
  // Since .cu isn't in their map, files open as 'plaintext' (all white).
  // This listener intercepts EVERY new model and re-assigns .cu files to cuda.

  monaco.editor.onDidCreateModel((model: any) => {
    try {
      const uri = model.uri ? model.uri.toString().toLowerCase() : '';
      if (uri.endsWith('.cu') || uri.endsWith('.cuh') || uri.endsWith('.ptx')) {
        const currentLang = model.getLanguageId ? model.getLanguageId() : '';
        if (currentLang !== 'cuda') {
          monaco.editor.setModelLanguage(model, 'cuda');
          const fileName = uri.split('/').pop() || uri.split('\\').pop() || uri;
          console.log('[CUDA] Re-assigned ' + fileName + ' from ' + currentLang + ' to cuda');
        }
      }
    } catch (e) {
      // Silently ignore - model might not be fully initialized
    }
  });

  // Also fix any models that were already created before this listener was set up
  try {
    const allModels = monaco.editor.getModels();
    if (allModels && allModels.length > 0) {
      for (let i = 0; i < allModels.length; i++) {
        const mdl = allModels[i];
        const mUri = mdl.uri ? mdl.uri.toString().toLowerCase() : '';
        if (mUri.endsWith('.cu') || mUri.endsWith('.cuh') || mUri.endsWith('.ptx')) {
          const lang = mdl.getLanguageId ? mdl.getLanguageId() : '';
          if (lang !== 'cuda') {
            monaco.editor.setModelLanguage(mdl, 'cuda');
            console.log('[CUDA] Fixed existing model: ' + mUri.split('/').pop());
          }
        }
      }
    }
  } catch (e) {
    // Models not ready yet - the listener above will catch future ones
  }

  console.log('[CUDA] Language registered with auto-detection for .cu, .cuh, .ptx');
}

export function isCudaFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['cu', 'cuh', 'ptx'].includes(ext);
}
