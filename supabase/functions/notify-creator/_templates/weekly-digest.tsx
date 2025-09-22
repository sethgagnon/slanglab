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

interface WeeklyDigestEmailProps {
  userName: string;
  weeklyStats: {
    totalSightings: number;
    termsTracked: number;
    topSources: Array<{ source: string; count: number }>;
    sparklineData: Array<{ day: number; count: number }>;
    topTerms: Array<{
      text: string;
      sightings: Array<{ title?: string; url: string; score: number }>;
    }>;
  };
  weekStart: string;
  unsubscribeToken: string;
}

export const WeeklyDigestEmail = ({
  userName,
  weeklyStats,
  weekStart,
  unsubscribeToken,
}: WeeklyDigestEmailProps) => {
  const maxCount = Math.max(...weeklyStats.sparklineData.map(d => d.count), 1);
  
  return (
    <Html>
      <Head />
      <Preview>📈 Your weekly SlangLab digest - {weeklyStats.totalSightings} new sightings!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📈 Your Weekly SlangLab Digest</Heading>
          
          <Text style={text}>
            Hey {userName},
          </Text>
          
          <Text style={text}>
            Here's your weekly tracking summary for the week of {weekStart}:
          </Text>

          {/* Summary Stats */}
          <Section style={statsSection}>
            <div style={statItem}>
              <Text style={statNumber}>{weeklyStats.totalSightings}</Text>
              <Text style={statLabel}>Total Sightings</Text>
            </div>
            <div style={statItem}>
              <Text style={statNumber}>{weeklyStats.termsTracked}</Text>
              <Text style={statLabel}>Terms Tracked</Text>
            </div>
          </Section>

          {/* Mini Sparkline */}
          <Section style={sparklineSection}>
            <Text style={sectionHeader}>📊 Daily Activity</Text>
            <div style={sparklineContainer}>
              {weeklyStats.sparklineData.map((day, index) => (
                <div
                  key={index}
                  style={{
                    ...sparklineBar,
                    height: `${Math.max((day.count / maxCount) * 40, 2)}px`,
                    backgroundColor: day.count > 0 ? '#48bb78' : '#e2e8f0',
                  }}
                  title={`Day ${index + 1}: ${day.count} sightings`}
                />
              ))}
            </div>
            <div style={sparklineLabels}>
              <Text style={labelText}>M</Text>
              <Text style={labelText}>T</Text>
              <Text style={labelText}>W</Text>
              <Text style={labelText}>T</Text>
              <Text style={labelText}>F</Text>
              <Text style={labelText}>S</Text>
              <Text style={labelText}>S</Text>
            </div>
          </Section>

          {/* Top Sources */}
          {weeklyStats.topSources.length > 0 && (
            <Section style={cardStyle}>
              <Text style={cardHeader}>🏆 Top Sources</Text>
              {weeklyStats.topSources.map((source, index) => (
                <Text key={index} style={sourceItem}>
                  <strong>{source.source}</strong>: {source.count} sightings
                </Text>
              ))}
            </Section>
          )}

          {/* Top Terms */}
          {weeklyStats.topTerms.length > 0 && (
            <Section style={cardStyle}>
              <Text style={cardHeader}>🔥 Most Active Terms</Text>
              {weeklyStats.topTerms.slice(0, 3).map((term, index) => (
                <div key={index} style={termItem}>
                  <Text style={termText}>
                    <strong>"{term.text}"</strong> - {term.sightings.length} sightings
                  </Text>
                  {term.sightings[0] && (
                    <Text style={termExample}>
                      Latest: <Link href={term.sightings[0].url} style={linkStyle}>
                        {term.sightings[0].title || 'View source'}
                      </Link>
                    </Text>
                  )}
                </div>
              ))}
            </Section>
          )}

          <Section style={ctaSection}>
            <Button 
              href="https://slanglab.app/dashboard" 
              style={primaryButtonStyle}
            >
              View Full Dashboard
            </Button>
          </Section>

          <Text style={text}>
            Keep creating and tracking! Your slang empire is growing 🚀
          </Text>

          <Hr style={hr} />
          
          <Text style={footer}>
            <Link
              href={`https://slanglab.app/unsubscribe?token=${unsubscribeToken}`}
              target="_blank"
              style={unsubscribeLink}
            >
              Unsubscribe from weekly digests
            </Link>
            <br />
            SlangLab - Track your slang creations
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WeeklyDigestEmail;

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

const statsSection = {
  display: 'flex',
  justifyContent: 'space-around',
  margin: '30px 0',
  padding: '20px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
};

const statItem = {
  textAlign: 'center' as const,
  flex: '1',
};

const statNumber = {
  color: '#2d3748',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const statLabel = {
  color: '#4a5568',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '12px',
  margin: '5px 0 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const sparklineSection = {
  margin: '30px 0',
  textAlign: 'center' as const,
};

const sectionHeader = {
  color: '#2d3748',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 15px 0',
};

const sparklineContainer = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  gap: '4px',
  height: '50px',
  margin: '15px 0 5px 0',
};

const sparklineBar = {
  width: '20px',
  minHeight: '2px',
  borderRadius: '2px 2px 0 0',
  transition: 'all 0.2s ease',
};

const sparklineLabels = {
  display: 'flex',
  justifyContent: 'center',
  gap: '4px',
};

const labelText = {
  color: '#718096',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '10px',
  width: '20px',
  textAlign: 'center' as const,
  margin: '0',
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
  margin: '0 0 15px 0',
};

const sourceItem = {
  color: '#4a5568',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '1.5',
};

const termItem = {
  margin: '15px 0',
  paddingBottom: '15px',
  borderBottom: '1px solid #e2e8f0',
};

const termText = {
  color: '#2d3748',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '14px',
  margin: '0 0 5px 0',
};

const termExample = {
  color: '#718096',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  fontSize: '12px',
  margin: '0',
};

const linkStyle = {
  color: '#667eea',
  textDecoration: 'underline',
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