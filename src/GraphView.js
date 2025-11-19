
import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function GraphView({ onNodeClick }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const graphRef = useRef();

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/notes?graph=true');
        if (!response.ok) {
          throw new Error('Failed to fetch graph data.');
        }
        const data = await response.json();
        setGraphData(JSON.parse(JSON.stringify(data)));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (isLoading) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading Graph...</div>;
  }

  if (error) {
    return <div style={{ color: '#fca5a5', textAlign: 'center', padding: '40px' }}>Error: {error}</div>;
  }

  return (
    <div style={{ background: '#1a1a1a', height: '100%', width: '100%' }}>
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="title"
        nodeVal={node => node.val || 1}
        nodeAutoColorBy="group"
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.006}
        linkColor={() => 'rgba(107, 114, 128, 0.5)'}
        linkWidth={1}
        height={window.innerHeight}
        width={window.innerWidth - (240)}
        onNodeClick={(node) => {
          // Center graph on node
          graphRef.current.centerAt(node.x, node.y, 1000);
          graphRef.current.zoom(2, 1000);
          // Pass node id (which is the path) to parent
          onNodeClick(node.id);
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.title;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

          ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#d1d5db';
          ctx.fillText(label, node.x, node.y);

          node.__bckgDimensions = bckgDimensions; // to use in nodePointerAreaPaint
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = node.__bckgDimensions;
          bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);
        }}
      />
    </div>
  );
}
