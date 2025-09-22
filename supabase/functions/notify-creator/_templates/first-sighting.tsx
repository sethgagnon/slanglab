import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface FirstSightingEmailProps {
  userName: string;
  termText: string;
  termSlug: string;
  sighting: {
    title?: string;
    url: string;
    source: string;
    score: number;
    snippet: string;
  };
  unsubscribeToken: string;
}

export const FirstSightingEmail = ({
  userName,
  termText,
  termSlug,
  sighting,
  unsubscribeToken,
}: FirstSightingEmailProps) => (
  <Html>
    <Head />
    <Preview>🎯 "{termText}" spotted in the wild!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎯 Your slang was spotted!</Heading>
        
        <Text style={text}>
          Hey {userName},
        </Text>
        
        <Text style={text}>
          Great news! Your tracked term <strong>"{termText}"</strong> was just spotted in the wild with a high confidence score!
        </Text>

        <Section style={cardStyle}>
          <Text style={cardHeader}>📍 Sighting Details</Text>
          <Text style={cardText}>
            <strong>Source:</strong> {sighting.source}<br/>
            <strong>Confidence Score:</strong> {sighting.score}/100<br/>
            {sighting.title && <><strong>Title:</strong> {sighting.title}<br/></>}
          </Text>
          <Text style={snippetStyle}>
            "{sighting.snippet}"
          </Text>
          <Button href={sighting.url} style={buttonStyle}>
            View Original Source
          </Button>
        </Section>

        <Text style={text}>
          This is just the beginning! Your slang is starting to gain traction. 
        </Text>

        <Section style={ctaSection}>
          <Button 
            href={`https://slanglab.app/term/${termSlug}`} 
            style={primaryButtonStyle}
          >
            View Full Tracking Dashboard
          </Button>
        </Section>

        <Hr style={hr} />
        
        <Text style={footer}>
          <Link
            href={`https://slanglab.app/unsubscribe?token=${unsubscribeToken}`}
            target="_blank"
            style={unsubscribeLink}
          >
            Unsubscribe from notifications
          </Link>
          <br />
          SlangLab - Track your slang creations
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FirstSightingEmail;

const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  padding: '45px',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  margin: '24px 0',
  lineHeight: '1.5',
};

const cardStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const cardHeader = {
  color: '#1a202c',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const cardText = {
  color: '#4a5568',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  margin: '10px 0',
  lineHeight: '1.5',
};

const snippetStyle = {
  color: '#2d3748',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  fontStyle: 'italic',
  padding: '10px',
  backgroundColor: '#edf2f7',
  borderLeft: '4px solid #667eea',
  margin: '15px 0',
};

const buttonStyle = {
  backgroundColor: '#667eea',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '15px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButtonStyle = {
  backgroundColor: '#48bb78',
  borderRadius: '6px',
  color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '22px',
  textAlign: 'center' as const,
};

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};